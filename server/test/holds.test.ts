import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { sweepExpired } from "../src/services/sweeper.js";
import { clock } from "../src/sim/clock.js";
import { auth, book, createClient, createExpert, createSlot, http, resetAll } from "./helpers.js";

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

beforeEach(resetAll);

describe("BR-09 unpaid hold", () => {
  it("an expired hold sets the booking to EXPIRED and releases the slot", async () => {
    const expert = await createExpert();
    const slot = await createSlot(expert.id, inDays(2));
    const a = await createClient();
    const created = await book(a.token, { expertId: expert.id, slotId: slot.id, mode: "VIDEO" });
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("LOCKED");

    clock.advanceMinutes(14);
    expect((await sweepExpired()).expiredHolds).toBe(0);
    clock.advanceMinutes(2);
    expect((await sweepExpired()).expiredHolds).toBe(1);

    expect((await prisma.booking.findUniqueOrThrow({ where: { id: created.body.id } })).status).toBe("EXPIRED");
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("AVAILABLE");
  });

  it("the sweeper also runs on ordinary requests, so another client can then book the slot", async () => {
    const expert = await createExpert();
    const slot = await createSlot(expert.id, inDays(2));
    const a = await createClient();
    const b = await createClient();
    await book(a.token, { expertId: expert.id, slotId: slot.id, mode: "CHAT" });
    expect((await book(b.token, { expertId: expert.id, slotId: slot.id, mode: "CHAT" })).status).toBe(409);

    clock.advanceMinutes(16);
    const retry = await book(b.token, { expertId: expert.id, slotId: slot.id, mode: "CHAT" });

    expect(retry.status).toBe(201);
  });

  it("an expired booking can no longer be paid", async () => {
    const expert = await createExpert();
    const slot = await createSlot(expert.id, inDays(2));
    const a = await createClient();
    const created = await book(a.token, { expertId: expert.id, slotId: slot.id, mode: "CHAT" });

    clock.advanceMinutes(16);
    const res = await http().get(`/api/bookings/${created.body.id}/payment-summary`).set(auth(a.token));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("BOOKING_EXPIRED");
  });

  it("a paid booking is never swept", async () => {
    const expert = await createExpert();
    const slot = await createSlot(expert.id, inDays(2));
    const a = await createClient();
    const created = await book(a.token, { expertId: expert.id, slotId: slot.id, mode: "CHAT" });
    const inv = await http().post(`/api/bookings/${created.body.id}/invoice`).set(auth(a.token)).send({ method: "QRIS" });
    await http().post(`/api/dev/gateway/${inv.body.invoiceRef}/pay`).send({ outcome: "success" });

    clock.advanceMinutes(60);
    await sweepExpired();

    expect((await prisma.booking.findUniqueOrThrow({ where: { id: created.body.id } })).status).toBe("PAID");
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("LOCKED");
  });
});
