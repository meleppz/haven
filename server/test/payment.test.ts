import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { clock } from "../src/sim/clock.js";
import { auth, book, createClient, createExpert, createSlot, http, resetAll } from "./helpers.js";

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000);

async function setup(opts: { promo?: boolean } = {}) {
  const expert = await createExpert({ tarif: 150_000 });
  const slot = await createSlot(expert.id, inDays(2));
  const client = await createClient({ verified: opts.promo });
  const booking = await book(client.token, { expertId: expert.id, slotId: slot.id, mode: "VIDEO", usePromo: opts.promo });
  return { expert, slot, client, bookingId: booking.body.id as string };
}

const invoice = (token: string, bookingId: string, method = "QRIS") =>
  http().post(`/api/bookings/${bookingId}/invoice`).set(auth(token)).send({ method });
const pay = (ref: string, outcome: "success" | "fail") => http().post(`/api/dev/gateway/${ref}/pay`).send({ outcome });

beforeEach(resetAll);

describe("invoice (BR-12)", () => {
  it("creates a QRIS invoice for the discounted total with a 15-minute expiry", async () => {
    const { client, bookingId } = await setup({ promo: true });

    const res = await invoice(client.token, bookingId);

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(136_000);
    expect(res.body.destination).toContain(res.body.invoiceRef);
    const left = new Date(res.body.expiresAt).getTime() - new Date(res.body.serverNow).getTime();
    expect(left).toBeLessThanOrEqual(15 * 60_000);
    expect(left).toBeGreaterThan(15 * 60_000 - 2000); // a few ms elapse between creating the invoice and the response
  });

  it("returns a method-specific destination", async () => {
    const { client, bookingId } = await setup();
    const va = await invoice(client.token, bookingId, "VIRTUAL_ACCOUNT");
    expect(va.body.destination).toMatch(/^\d{16}$/);
    const bank = await invoice(client.token, bookingId, "BANK_TRANSFER");
    expect(bank.body.destination).toContain("BCA");
  });

  it("switching the method cancels the previous pending invoice", async () => {
    const { client, bookingId } = await setup();
    const first = await invoice(client.token, bookingId, "QRIS");
    await invoice(client.token, bookingId, "EWALLET");

    const old = await prisma.invoice.findUniqueOrThrow({ where: { ref: first.body.invoiceRef } });
    expect(old.status).toBe("CANCELLED");
  });
});

describe("successful payment", () => {
  it("callback -> re-verify -> Transaction saved, booking PAID, receipt issued", async () => {
    const { client, bookingId } = await setup({ promo: true });
    const inv = await invoice(client.token, bookingId);

    const paid = await pay(inv.body.invoiceRef, "success");
    expect(paid.status).toBe(200);

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { transaction: true } });
    expect(booking.status).toBe("PAID");
    expect(booking.holdExpiresAt).toBeNull();
    expect(booking.transaction).toMatchObject({ tarif: 150_000, adminFee: 20_000, discount: 34_000, total: 136_000 });
    expect(booking.transaction!.receiptNo).toMatch(/^HVN-\d{8}-/);

    const status = await http().get(`/api/payments/${inv.body.invoiceRef}`).set(auth(client.token));
    expect(status.body.status).toBe("PAID");
    const receipt = await http().get(`/api/payments/${inv.body.invoiceRef}/receipt`).set(auth(client.token));
    expect(receipt.body.pricing.total).toBe(136_000);
  });

  it("a duplicate callback is idempotent", async () => {
    const { client, bookingId } = await setup();
    const inv = await invoice(client.token, bookingId);
    await pay(inv.body.invoiceRef, "success");

    const again = await http().post("/api/webhooks/payment").send({ invoiceRef: inv.body.invoiceRef, status: "PAID" });
    const concurrent = await Promise.all([1, 2, 3].map(() => http().post("/api/webhooks/payment").send({ invoiceRef: inv.body.invoiceRef, status: "PAID" })));

    expect(again.status).toBe(200);
    expect(again.body.processed).toBe(false);
    expect(concurrent.every((r) => r.status === 200)).toBe(true);
    expect(await prisma.transaction.count()).toBe(1);
  });

  it("concurrent first callbacks create a single Transaction", async () => {
    const { client, bookingId } = await setup();
    const inv = await invoice(client.token, bookingId);
    await prisma.invoice.update({ where: { ref: inv.body.invoiceRef }, data: { status: "PAID" } }); // gateway state: paid

    const results = await Promise.all([1, 2, 3, 4].map(() => http().post("/api/webhooks/payment").send({ invoiceRef: inv.body.invoiceRef, status: "PAID" })));

    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await prisma.transaction.count()).toBe(1);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe("PAID");
  });
});

describe("failed or forged payment changes nothing (S2 term 3, S3 term 3)", () => {
  it("a failed payment leaves the booking awaiting payment and allows a retry", async () => {
    const { client, bookingId } = await setup();
    const inv = await invoice(client.token, bookingId);

    await pay(inv.body.invoiceRef, "fail");

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.status).toBe("AWAITING_PAYMENT");
    expect(await prisma.transaction.count()).toBe(0);
    expect((await prisma.invoice.findUniqueOrThrow({ where: { ref: inv.body.invoiceRef } })).status).toBe("FAILED");

    const retry = await invoice(client.token, bookingId, "QRIS");
    expect(retry.status).toBe(201);
  });

  it("a forged PAID callback for a still-pending invoice is rejected by re-verification", async () => {
    const { client, bookingId } = await setup();
    const inv = await invoice(client.token, bookingId);

    const res = await http().post("/api/webhooks/payment").send({ invoiceRef: inv.body.invoiceRef, status: "PAID" });

    expect(res.status).toBe(200);
    expect(res.body.processed).toBe(false);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe("AWAITING_PAYMENT");
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("an expired invoice cannot be paid and the slot is released (BR-09)", async () => {
    const { client, bookingId, slot } = await setup();
    const inv = await invoice(client.token, bookingId);

    clock.advanceMinutes(16);
    const res = await pay(inv.body.invoiceRef, "success");

    expect(res.status).toBe(409);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe("EXPIRED");
    expect((await prisma.slot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe("AVAILABLE");
  });

  it("only the owner can pay or read an invoice", async () => {
    const { client, bookingId } = await setup();
    const stranger = await createClient();

    expect((await invoice(stranger.token, bookingId)).status).toBe(403);
    const inv = await invoice(client.token, bookingId);
    expect((await http().get(`/api/payments/${inv.body.invoiceRef}`).set(auth(stranger.token))).status).toBe(403);
  });
});
