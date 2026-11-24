// SC-12 Layanan Pembayaran (task service): payment summary, invoice, webhook and receipt
// (S2 `siapkanPembayaran`, `buatTagihanKonsultasi`, `selesaikanPembayaran`; S3 `terimaNotifikasi` + `verifikasiStatusPembayaran`;
// FA-16..25; BR-10, BR-12).
import { randomInt } from "node:crypto";
import { config } from "../config.js";
import { prisma } from "../db.js";
import type { PayMethod } from "../generated/prisma/enums.js";
import { conflict, forbidden, notFound } from "../lib/errors.js";
import { wibDateKey } from "../lib/time.js";
import { clock } from "../sim/clock.js";
import * as gateway from "../sim/gateway.js";
import { BOOKING_INCLUDE, toBookingDto } from "../services/bookings.js";
import { computePricing } from "../services/pricing.js";
import { sweepExpired } from "../services/sweeper.js";

async function payableBooking(clientId: string, bookingId: string) {
  await sweepExpired();
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: BOOKING_INCLUDE });
  if (!b) throw notFound("Pemesanan");
  if (b.clientId !== clientId) throw forbidden("NOT_OWNER", "Pemesanan ini bukan milikmu.");
  if (b.status === "EXPIRED") throw conflict("BOOKING_EXPIRED", "Waktu pembayaran habis, silakan pilih slot lagi.");
  if (b.status !== "AWAITING_PAYMENT") throw conflict("NOT_PAYABLE", "Pemesanan ini sudah tidak menunggu pembayaran.");
  return b;
}

/** FA-16, FA-18: "Rincian Pembayaran". Prices come from the expert's tarif (handoff §13 #1). */
export async function paymentSummary(clientId: string, bookingId: string) {
  const b = await payableBooking(clientId, bookingId);
  return { booking: toBookingDto(b), pricing: computePricing(b.expert.tarif, b.usePromo), methods: ["BANK_TRANSFER", "QRIS", "VIRTUAL_ACCOUNT", "EWALLET"] as PayMethod[] };
}

/** FA-19, FA-20. Switching method cancels the previous pending invoice. The hold is extended to the new invoice's expiry. */
export async function createInvoice(clientId: string, bookingId: string, method: PayMethod) {
  const b = await payableBooking(clientId, bookingId);
  const pricing = computePricing(b.expert.tarif, b.usePromo);
  await prisma.invoice.updateMany({ where: { bookingId, status: "PENDING" }, data: { status: "CANCELLED" } });
  const inv = await gateway.createInvoice({ bookingId, method, amount: pricing.total });
  if (!b.holdExpiresAt || b.holdExpiresAt < inv.expiresAt) {
    await prisma.booking.update({ where: { id: bookingId }, data: { holdExpiresAt: inv.expiresAt } });
  }
  return { invoiceRef: inv.ref, method: inv.method, destination: inv.destination, amount: inv.amount, expiresAt: inv.expiresAt.toISOString(), pricing, serverNow: clock.now().toISOString() };
}

/** Poll target for the "Menunggu Pembayaran" screen. */
export async function paymentStatus(clientId: string, ref: string) {
  await sweepExpired();
  const inv = await gateway.getInvoice(ref);
  if (!inv) throw notFound("Tagihan");
  const b = await prisma.booking.findUniqueOrThrow({ where: { id: inv.bookingId } });
  if (b.clientId !== clientId) throw forbidden("NOT_OWNER", "Tagihan ini bukan milikmu.");
  return { invoiceRef: inv.ref, status: inv.status, bookingStatus: b.status, expiresAt: inv.expiresAt.toISOString(), serverNow: clock.now().toISOString() };
}

const newReceiptNo = () => `HVN-${wibDateKey(clock.now()).replaceAll("-", "")}-${randomInt(0, 36 ** 5).toString(36).toUpperCase().padStart(5, "0")}`;

/**
 * S3: the gateway's callback is never trusted by itself. Haven re-verifies the invoice status with the gateway
 * (`verifikasiStatusPembayaran`) and only then, in ONE transaction, saves the Transaction, sets the Booking to PAID
 * and issues a receipt number. A failed payment changes nothing (S2 term 3). Callbacks are idempotent: a duplicate
 * is a no-op (Transaction.bookingId / invoiceRef are unique).
 */
export async function handlePaymentWebhook(invoiceRef: string) {
  const inv = await gateway.getInvoice(invoiceRef);
  if (!inv) throw notFound("Tagihan");
  if (inv.status !== "PAID") return { processed: false, status: inv.status };

  try {
    return await prisma.$transaction(async (tx) => {
      const b = await tx.booking.findUniqueOrThrow({ where: { id: inv.bookingId }, include: { expert: true, transaction: true } });
      if (b.transaction) return { processed: false, status: "PAID" as const, alreadyProcessed: true };
      if (b.status !== "AWAITING_PAYMENT") return { processed: false, status: inv.status };
      const pricing = computePricing(b.expert.tarif, b.usePromo);
      if (pricing.total !== inv.amount) return { processed: false, status: "AMOUNT_MISMATCH" as const };

      const t = await tx.transaction.create({
        data: {
          bookingId: b.id,
          invoiceRef: inv.ref,
          method: inv.method,
          tarif: pricing.tarif,
          adminFee: pricing.adminFee,
          discount: pricing.discount,
          total: pricing.total,
          paidAt: clock.now(),
          receiptNo: newReceiptNo(),
        },
      });
      await tx.booking.update({ where: { id: b.id }, data: { status: "PAID", holdExpiresAt: null } });
      return { processed: true, status: "PAID" as const, receiptNo: t.receiptNo };
    });
  } catch (e) {
    // A concurrent duplicate callback loses the unique-constraint race: treat as already processed.
    if ((e as { code?: string }).code === "P2002") return { processed: false, status: "PAID" as const, alreadyProcessed: true };
    throw e;
  }
}

/** FA-25: receipt data for the PDF ("Unduh Bukti Pembayaran"). */
export async function receipt(clientId: string, ref: string) {
  const t = await prisma.transaction.findUnique({ where: { invoiceRef: ref }, include: { booking: { include: BOOKING_INCLUDE } } });
  if (!t) throw notFound("Bukti pembayaran");
  if (t.booking.clientId !== clientId) throw forbidden("NOT_OWNER", "Bukti pembayaran ini bukan milikmu.");
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  return {
    receiptNo: t.receiptNo,
    paidAt: t.paidAt.toISOString(),
    method: t.method,
    customerName: client.name,
    expert: { name: t.booking.expert.name },
    slot: toBookingDto(t.booking).slot,
    mode: t.booking.mode,
    pricing: { tarif: t.tarif, adminFee: t.adminFee, discount: t.discount, total: t.total },
    issuer: "PT Haven Sehat Indonesia",
    demo: config.demoMode,
  };
}
