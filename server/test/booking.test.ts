import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { computePricing } from "../src/services/pricing.js";
import { auth, book, createClient, createExpert, createSlot, http, resetAll } from "./helpers.js";

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

beforeEach(resetAll);

describe("BR-08 atomic slot lock", () => {
  it("two concurrent requests for the same slot give exactly one 201 and one 409", async () => {
    const expert = await createExpert();
    const slot = await createSlot(expert.id, inDays(2));
    const [a, b] = await Promise.all([createClient(), createClient()]);

    const results = await Promise.all([
      book(a.token, { expertId: expert.id, slotId: slot.id, mode: "VIDEO" }),
      book(b.token, { expertId: expert.id, slotId: slot.id, mode: "VIDEO" }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = results.find((r) => r.status === 409)!;
    expect(loser.body.error.code).toBe("SLOT_CONFLICT");
    expect(await prisma.booking.count({ where: { slotId: slot.id } })).toBe(1);
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("LOCKED");
  });

  it("five concurrent requests still produce a single booking", async () => {
    const expert = await createExpert();
    const slot = await createSlot(expert.id, inDays(3));
    const clients = await Promise.all([1, 2, 3, 4, 5].map(() => createClient()));

    const results = await Promise.all(clients.map((c) => book(c.token, { expertId: expert.id, slotId: slot.id, mode: "CHAT" })));

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect(await prisma.booking.count()).toBe(1);
  });

  it("creates an AWAITING_PAYMENT booking with a 15-minute hold (BR-09)", async () => {
    const expert = await createExpert();
    const slot = await createSlot(expert.id, inDays(2));
    const c = await createClient();

    const res = await book(c.token, { expertId: expert.id, slotId: slot.id, mode: "VIDEO", description: "Ingin cerita" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("AWAITING_PAYMENT");
    const hold = new Date(res.body.holdExpiresAt).getTime() - new Date(res.body.serverNow).getTime();
    expect(hold).toBeLessThanOrEqual(15 * 60_000);
    expect(hold).toBeGreaterThan(15 * 60_000 - 2000);
  });
});

describe("BR-07 booking validation (nothing is saved on failure)", () => {
  it("rejects a mode the expert does not offer", async () => {
    const expert = await createExpert({ modes: ["CHAT"] });
    const slot = await createSlot(expert.id, inDays(2));
    const c = await createClient();

    const res = await book(c.token, { expertId: expert.id, slotId: slot.id, mode: "VIDEO" });

    expect(res.status).toBe(422);
    expect(res.body.error.fields.mode).toBeTruthy();
    expect(await prisma.booking.count()).toBe(0);
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("AVAILABLE");
  });

  it("requires a verified student for the promo (PROMO_NOT_ELIGIBLE)", async () => {
    const expert = await createExpert();
    const slot = await createSlot(expert.id, inDays(2));
    const c = await createClient({ verified: false });

    const res = await book(c.token, { expertId: expert.id, slotId: slot.id, mode: "VIDEO", usePromo: true });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("PROMO_NOT_ELIGIBLE");
    expect(await prisma.booking.count()).toBe(0);
  });

  it("rejects past slots, other experts' slots and over-long descriptions", async () => {
    const expert = await createExpert();
    const other = await createExpert();
    const past = await createSlot(expert.id, new Date(Date.now() - 3_600_000));
    const foreign = await createSlot(other.id, inDays(2));
    const ok = await createSlot(expert.id, inDays(4));
    const c = await createClient();

    expect((await book(c.token, { expertId: expert.id, slotId: past.id, mode: "CHAT" })).status).toBe(422);
    expect((await book(c.token, { expertId: expert.id, slotId: foreign.id, mode: "CHAT" })).status).toBe(422);
    const long = await book(c.token, { expertId: expert.id, slotId: ok.id, mode: "CHAT", description: "x".repeat(501) });
    expect(long.status).toBe(422);
    expect(long.body.error.fields.description).toBeTruthy();
    expect(await prisma.booking.count()).toBe(0);
  });

  it("requires login (BR-01)", async () => {
    const res = await http().post("/api/bookings").send({});
    expect(res.status).toBe(401);
  });

  it("uses the settings defaults for anonymity and the student promo (BR-14, BR-21)", async () => {
    const expert = await createExpert();
    const slot = await createSlot(expert.id, inDays(2));
    const c = await createClient({ verified: true, anonymousDefault: true });
    await prisma.client.update({ where: { id: c.clientId }, data: { autoStudentPromo: true } });

    const res = await book(c.token, { expertId: expert.id, slotId: slot.id, mode: "CHAT" });

    expect(res.status).toBe(201);
    expect(res.body.anonymous).toBe(true);
    expect(res.body.usePromo).toBe(true);
  });
});

describe("BR-10 pricing", () => {
  it("150.000 + 20.000 admin - 20% student discount = 136.000", () => {
    expect(computePricing(150_000, true)).toEqual({ tarif: 150_000, adminFee: 20_000, subtotal: 170_000, discount: 34_000, total: 136_000 });
  });

  it("has no discount without the promo", () => {
    expect(computePricing(150_000, false).total).toBe(170_000);
  });

  it("the payment summary for a promo booking shows 136.000", async () => {
    const expert = await createExpert({ tarif: 150_000 });
    const slot = await createSlot(expert.id, inDays(2));
    const c = await createClient({ verified: true });
    const created = await book(c.token, { expertId: expert.id, slotId: slot.id, mode: "VIDEO", usePromo: true });

    const res = await http().get(`/api/bookings/${created.body.id}/payment-summary`).set(auth(c.token));

    expect(res.status).toBe(200);
    expect(res.body.pricing.total).toBe(136_000);
    expect(res.body.pricing.discount).toBe(34_000);
  });
});
