import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { addMinutes } from "../src/lib/time.js";
import { createPaidBooking } from "../src/seed/index.js";
import { clock } from "../src/sim/clock.js";
import { auth, createClient, createExpert, http, resetAll } from "./helpers.js";

const NOW = new Date("2026-12-01T03:00:00Z");

beforeEach(async () => {
  await resetAll();
  clock.freeze(NOW);
});

describe("DELETE /me (Hapus akun Haven)", () => {
  it("removes the account, frees future slots, takes the review out of the rating, and the token stops working", async () => {
    const expert = await createExpert({ rating: 4, ratingCount: 2 });
    const client = await createClient();
    const future = await createPaidBooking(prisma, { clientId: client.clientId, expertId: expert.id, startAt: addMinutes(NOW, 3 * 24 * 60), mode: "VIDEO" });
    const past = await createPaidBooking(prisma, { clientId: client.clientId, expertId: expert.id, startAt: addMinutes(NOW, -3 * 24 * 60), mode: "CHAT" });
    await prisma.booking.update({ where: { id: past.id }, data: { status: "COMPLETED" } });
    const review = await http().post(`/api/bookings/${past.id}/review`).set(auth(client.token)).send({ rating: 1 });
    expect(review.status).toBe(201);
    expect((await prisma.expert.findUniqueOrThrow({ where: { id: expert.id } })).ratingCount).toBe(3);

    const res = await http().delete("/api/me").set(auth(client.token));
    expect(res.status).toBe(200);

    expect(await prisma.client.count({ where: { id: client.clientId } })).toBe(0);
    expect(await prisma.booking.count({ where: { clientId: client.clientId } })).toBe(0);
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: future.slotId } })).status).toBe("AVAILABLE");
    const e = await prisma.expert.findUniqueOrThrow({ where: { id: expert.id } });
    expect(e.ratingCount).toBe(2);
    expect(e.ratingAvg).toBeCloseTo(4, 5);

    const after = await http().get("/api/me").set(auth(client.token));
    expect(after.status).toBe(401);
  });

  it("refuses while a session is in progress", async () => {
    const expert = await createExpert();
    const client = await createClient();
    const b = await createPaidBooking(prisma, { clientId: client.clientId, expertId: expert.id, startAt: NOW, mode: "VIDEO" });
    await prisma.booking.update({ where: { id: b.id }, data: { status: "IN_SESSION", joinedAt: NOW } });

    const res = await http().delete("/api/me").set(auth(client.token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("SESSION_IN_PROGRESS");
    expect(await prisma.client.count({ where: { id: client.clientId } })).toBe(1);
  });
});
