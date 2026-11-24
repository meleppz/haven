import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { addMinutes } from "../src/lib/time.js";
import { createPaidBooking } from "../src/seed/index.js";
import { clock } from "../src/sim/clock.js";
import { auth, createClient, createExpert, createSlot, http, resetAll } from "./helpers.js";

const NOW = new Date("2026-12-01T03:00:00Z");
const hoursFromNow = (h: number) => addMinutes(NOW, h * 60);

beforeEach(async () => {
  await resetAll();
  clock.freeze(NOW);
});

describe("BR-17 reviews", () => {
  async function completed(ratingAvg = 4, ratingCount = 2) {
    const expert = await createExpert({ rating: ratingAvg, ratingCount });
    const client = await createClient();
    const booking = await createPaidBooking(prisma, {
      clientId: client.clientId, expertId: expert.id, startAt: hoursFromNow(-48), mode: "CHAT", status: "COMPLETED", durationMinutes: 30,
    });
    return { expert, client, booking };
  }
  const review = (token: string, id: string, body: object) => http().post(`/api/bookings/${id}/review`).set(auth(token)).send(body);

  it("updates the expert's ratingAvg and ratingCount in the same transaction", async () => {
    const { expert, client, booking } = await completed(4, 2);

    const res = await review(client.token, booking.id, { rating: 5, text: "Sangat membantu" });

    expect(res.status).toBe(201);
    expect(res.body.reviewed).toBe(true);
    const e = await prisma.expert.findUniqueOrThrow({ where: { id: expert.id } });
    expect(e.ratingCount).toBe(3);
    expect(e.ratingAvg).toBeCloseTo((4 * 2 + 5) / 3, 5);
  });

  it("allows one review per booking, only after completion, with a rating of 1-5", async () => {
    const { client, booking } = await completed();
    expect((await review(client.token, booking.id, { rating: 0 })).status).toBe(422);
    expect((await review(client.token, booking.id, { rating: 6 })).status).toBe(422);
    expect((await review(client.token, booking.id, { rating: 4 })).status).toBe(201);
    const dup = await review(client.token, booking.id, { rating: 5 });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("ALREADY_REVIEWED");

    const expert = await createExpert();
    const paid = await createPaidBooking(prisma, { clientId: client.clientId, expertId: expert.id, startAt: hoursFromNow(5), mode: "CHAT" });
    expect((await review(client.token, paid.id, { rating: 5 })).status).toBe(409);
  });

  it("public review cards always show the author as 'Anonymous'", async () => {
    const { expert, client, booking } = await completed();
    await review(client.token, booking.id, { rating: 5, text: "Mantap" });

    const res = await http().get(`/api/experts/${expert.id}/reviews`);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ author: "Anonymous", rating: 5, text: "Mantap" });
    expect(JSON.stringify(res.body)).not.toContain(client.email);
  });
});

describe("BR-18 cancel and reschedule", () => {
  async function paid(startInHours: number) {
    const expert = await createExpert();
    const client = await createClient();
    const booking = await createPaidBooking(prisma, { clientId: client.clientId, expertId: expert.id, startAt: hoursFromNow(startInHours), mode: "VIDEO" });
    return { expert, client, booking };
  }
  const cancel = (token: string, id: string, body: object = {}) => http().post(`/api/bookings/${id}/cancel`).set(auth(token)).send(body);

  it(">= 48h before start: free cancel, slot released, no penalty", async () => {
    const { client, booking } = await paid(48);

    const res = await cancel(client.token, booking.id);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
    expect(res.body.penaltyApplied).toBe(false);
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: booking.slotId } })).status).toBe("AVAILABLE");
  });

  it("< 48h: cancel needs the penalty confirmation, then records the penalty", async () => {
    const { client, booking } = await paid(47);

    const warn = await cancel(client.token, booking.id);
    expect(warn.status).toBe(409);
    expect(warn.body.error.code).toBe("PENALTY_CONFIRM_REQUIRED");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PAID");

    const done = await cancel(client.token, booking.id, { confirmPenalty: true });
    expect(done.status).toBe(200);
    expect(done.body.penaltyApplied).toBe(true);
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: booking.slotId } })).status).toBe("AVAILABLE");
  });

  it("reschedule >= 48h moves to another free slot of the same expert and releases the old one", async () => {
    const { expert, client, booking } = await paid(72);
    const target = await createSlot(expert.id, hoursFromNow(96));

    const res = await http().post(`/api/bookings/${booking.id}/reschedule`).set(auth(client.token)).send({ slotId: target.id });

    expect(res.status).toBe(200);
    expect(res.body.slot.id).toBe(target.id);
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: target.id } })).status).toBe("LOCKED");
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: booking.slotId } })).status).toBe("AVAILABLE");
  });

  it("reschedule < 48h is refused", async () => {
    const { expert, client, booking } = await paid(24);
    const target = await createSlot(expert.id, hoursFromNow(96));

    const res = await http().post(`/api/bookings/${booking.id}/reschedule`).set(auth(client.token)).send({ slotId: target.id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("RESCHEDULE_TOO_LATE");
  });

  it("reschedule to an already taken slot -> 409 and the original stays booked", async () => {
    const { expert, client, booking } = await paid(72);
    const taken = await createSlot(expert.id, hoursFromNow(100), "LOCKED");

    const res = await http().post(`/api/bookings/${booking.id}/reschedule`).set(auth(client.token)).send({ slotId: taken.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SLOT_CONFLICT");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).slotId).toBe(booking.slotId);
  });

  it("an unpaid booking can be cancelled to release its slot", async () => {
    const expert = await createExpert();
    const slot = await createSlot(expert.id, hoursFromNow(72));
    const client = await createClient();
    const created = await http().post("/api/bookings").set(auth(client.token)).send({ expertId: expert.id, slotId: slot.id, mode: "CHAT" });

    const res = await cancel(client.token, created.body.id);

    expect(res.body.status).toBe("CANCELLED");
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("AVAILABLE");
  });
});
