// Mock payment gateway (handoff §10; S3 `Layanan Gateway Pembayaran`). In-process, but it acts as the EXTERNAL provider:
// it owns the Invoice table, and reports results by calling Haven's webhook over HTTP so the S3 boundary stays visible.
import { randomInt } from "node:crypto";
import { config } from "../config.js";
import { prisma } from "../db.js";
import type { Invoice } from "../generated/prisma/client.js";
import type { PayMethod } from "../generated/prisma/enums.js";
import { conflict, notFound } from "../lib/errors.js";
import { addMinutes } from "../lib/time.js";
import { clock } from "./clock.js";

export type WebhookPayload = { invoiceRef: string; status: "PAID" | "FAILED" };
export type WebhookSender = (payload: WebhookPayload) => Promise<void>;

const httpSender: WebhookSender = async (payload) => {
  try {
    await fetch(config.gatewayWebhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  } catch (e) {
    console.warn("[gateway] webhook delivery failed:", (e as Error).message);
  }
};

let sender: WebhookSender = httpSender;
/** Tests replace the transport so the callback goes straight to the app without a network port. */
export const setWebhookSender = (fn: WebhookSender | null) => {
  sender = fn ?? httpSender;
};

const randomDigits = (n: number) => Array.from({ length: n }, () => randomInt(0, 10)).join("");
const randomRef = () => `INV-${Date.now().toString(36).toUpperCase()}${randomInt(0, 36 ** 4).toString(36).toUpperCase().padStart(4, "0")}`;

function destinationFor(method: PayMethod, ref: string, amount: number): string {
  switch (method) {
    case "QRIS": return `HAVEN.QRIS.${ref}.${amount}`; // QR payload string
    case "VIRTUAL_ACCOUNT": return randomDigits(16);
    case "BANK_TRANSFER": return "BCA 123-456-7890 a.n. PT Haven Sehat Indonesia";
    case "EWALLET": return `haven-ewallet://pay/${ref}`;
  }
}

export async function createInvoice(input: { bookingId: string; method: PayMethod; amount: number }): Promise<Invoice> {
  const ref = randomRef();
  return prisma.invoice.create({
    data: {
      ref,
      bookingId: input.bookingId,
      method: input.method,
      amount: input.amount,
      destination: destinationFor(input.method, ref, input.amount),
      expiresAt: addMinutes(clock.now(), config.invoiceMinutes),
    },
  });
}

/** The gateway is the source of truth for invoice state; a pending invoice past its expiry becomes EXPIRED. */
export async function getInvoice(ref: string): Promise<Invoice | null> {
  const inv = await prisma.invoice.findUnique({ where: { ref } });
  if (inv && inv.status === "PENDING" && inv.expiresAt <= clock.now()) {
    return prisma.invoice.update({ where: { ref }, data: { status: "EXPIRED" } });
  }
  return inv;
}

/** Simulates the customer paying (or failing to pay) outside Haven, then fires the callback to Haven. */
export async function simulatePayment(ref: string, outcome: "success" | "fail") {
  const inv = await getInvoice(ref);
  if (!inv) throw notFound("Tagihan");
  if (inv.status !== "PENDING") throw conflict("INVOICE_NOT_PENDING", "Tagihan ini sudah tidak bisa dibayar.");
  const status = outcome === "success" ? "PAID" : "FAILED";
  await prisma.invoice.update({ where: { ref }, data: { status } });
  await sender({ invoiceRef: ref, status });
  return { invoiceRef: ref, status };
}
