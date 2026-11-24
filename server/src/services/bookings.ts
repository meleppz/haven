// SC-05 Pendaftaran: booking reads, cancel/reschedule (BR-18) and reviews (BR-17).
import { config } from "../config.js";
import { prisma } from "../db.js";
import type { Booking, Expert, Invoice, Review, SessionNote, Slot, Transaction } from "../generated/prisma/client.js";
import { conflict, forbidden, invalid, notFound } from "../lib/errors.js";
import { MIN_MS, slotLabel, wibDateKey } from "../lib/time.js";
import { clock } from "../sim/clock.js";

type FullBooking = Booking & {
  expert: Expert;
  slot: Slot;
  note: SessionNote | null;
  review: Review | null;
  transaction: Transaction | null;
  invoices?: Invoice[];
};

export const BOOKING_INCLUDE = { expert: true, slot: true, note: true, review: true, transaction: true } as const;

export type JoinState = "TOO_EARLY" | "OPEN" | "ENDED";

/** BR-13 window: [start - 30 min, end]. The server is the authority; the app only mirrors it. */
export function joinState(slot: Pick<Slot, "startAt" | "endAt">, now: Date): JoinState {
  if (now.getTime() < slot.startAt.getTime() - config.joinOpensMinutesBefore * MIN_MS) return "TOO_EARLY";
  if (now.getTime() > slot.endAt.getTime()) return "ENDED";
  return "OPEN";
}

export function toBookingDto(b: FullBooking, now = clock.now()) {
  const state = joinState(b.slot, now);
  const live = b.status === "PAID" || b.status === "IN_SESSION";
  return {
    id: b.id,
    status: b.status,
    mode: b.mode,
    anonymous: b.anonymous,
    description: b.description,
    usePromo: b.usePromo,
    holdExpiresAt: b.holdExpiresAt?.toISOString() ?? null,
    penaltyApplied: b.penaltyApplied,
    createdAt: b.createdAt.toISOString(),
    expert: { id: b.expert.id, name: b.expert.name, type: b.expert.type, photoUrl: b.expert.photoUrl, licenseNo: b.expert.licenseNo },
    slot: {
      id: b.slot.id,
      startAt: b.slot.startAt.toISOString(),
      endAt: b.slot.endAt.toISOString(),
      label: slotLabel(b.slot.startAt, b.slot.endAt),
      date: wibDateKey(b.slot.startAt),
    },
    canJoin: live && state === "OPEN",
    inProgress: b.status === "IN_SESSION" || (live && state === "OPEN" && now >= b.slot.startAt),
    startsInMinutes: Math.ceil((b.slot.startAt.getTime() - now.getTime()) / MIN_MS),
    e2eAccepted: b.e2eAcceptedAt !== null,
    joinedAt: b.joinedAt?.toISOString() ?? null,
    endedAt: b.endedAt?.toISOString() ?? null,
    durationMinutes: b.durationMinutes,
    reviewed: b.review !== null,
    review: b.review ? { rating: b.review.rating, text: b.review.text } : null,
    // Notes appear once the expert's notes are saved; until then the app shows "sedang disiapkan".
    notes: b.note ? { summary: b.note.summary, advice: b.note.advice } : null,
    transaction: b.transaction
      ? { receiptNo: b.transaction.receiptNo, total: b.transaction.total, method: b.transaction.method, paidAt: b.transaction.paidAt.toISOString() }
      : null,
    serverNow: now.toISOString(),
  };
}

async function ownedBooking(clientId: string, id: string) {
  const b = await prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
  if (!b) throw notFound("Pemesanan");
  if (b.clientId !== clientId) throw forbidden("NOT_OWNER", "Pemesanan ini bukan milikmu.");
  return b;
}

export async function getBooking(clientId: string, id: string) {
  return toBookingDto(await ownedBooking(clientId, id));
}

/** FA-15. upcoming = paid / in-session and not yet over; history = completed sessions, newest first. */
export async function listBookings(clientId: string, scope: "upcoming" | "history", q?: string) {
  const now = clock.now();
  const rows = await prisma.booking.findMany({
    where: scope === "upcoming" ? { clientId, status: { in: ["PAID", "IN_SESSION"] } } : { clientId, status: "COMPLETED" },
    include: BOOKING_INCLUDE,
  });
  const needle = q?.trim().toLowerCase();
  return rows
    .filter((b) => (scope === "upcoming" ? b.slot.endAt >= now : true))
    .filter((b) => !needle || b.expert.name.toLowerCase().includes(needle))
    .sort((a, b) => (scope === "upcoming" ? a.slot.startAt.getTime() - b.slot.startAt.getTime() : b.slot.startAt.getTime() - a.slot.startAt.getTime()))
    .map((b) => toBookingDto(b, now));
}

const hoursUntil = (slot: Slot, now: Date) => (slot.startAt.getTime() - now.getTime()) / 3_600_000;

/**
 * BR-18. >= 48h before start: free cancel, slot released. < 48h: allowed only after the warning is confirmed,
 * and the penalty is recorded (no real money).
 */
export async function cancelBooking(clientId: string, id: string, confirmPenalty = false) {
  const b = await ownedBooking(clientId, id);
  const now = clock.now();
  if (b.status !== "PAID" && b.status !== "AWAITING_PAYMENT") throw conflict("NOT_CANCELLABLE", "Pemesanan ini sudah tidak bisa dibatalkan.");

  let penalty = false;
  if (b.status === "PAID") {
    if (b.slot.startAt <= now) throw conflict("ALREADY_STARTED", "Jadwal ini sudah dimulai.");
    if (hoursUntil(b.slot, now) < config.rescheduleCutoffHours) {
      if (!confirmPenalty) {
        throw conflict("PENALTY_CONFIRM_REQUIRED", "Pembatalan kurang dari 2x24 jam akan dikenakan denda.");
      }
      penalty = true;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id }, data: { status: "CANCELLED", holdExpiresAt: null, penaltyApplied: penalty } });
    await tx.slot.update({ where: { id: b.slotId }, data: { status: "AVAILABLE" } });
    await tx.invoice.updateMany({ where: { bookingId: id, status: "PENDING" }, data: { status: "CANCELLED" } });
  });
  return getBooking(clientId, id);
}

/** BR-18: reschedule needs >= 48h; the new slot is locked atomically before the old one is released. */
export async function rescheduleBooking(clientId: string, id: string, newSlotId: string) {
  const b = await ownedBooking(clientId, id);
  const now = clock.now();
  if (b.status !== "PAID") throw conflict("NOT_RESCHEDULABLE", "Hanya jadwal yang sudah dibayar yang bisa diganti.");
  if (hoursUntil(b.slot, now) < config.rescheduleCutoffHours) {
    throw forbidden("RESCHEDULE_TOO_LATE", "Jadwal tidak bisa dipindahkan kurang dari 2x24 jam sebelum jadwal.");
  }
  const target = await prisma.slot.findUnique({ where: { id: newSlotId } });
  if (!target || target.expertId !== b.expertId || target.startAt <= now) {
    throw invalid("SLOT_UNAVAILABLE", "Slot ini tidak tersedia, silakan pilih slot lain.", { slotId: "Slot tidak tersedia" });
  }
  await prisma.$transaction(async (tx) => {
    const lock = await tx.slot.updateMany({ where: { id: newSlotId, status: "AVAILABLE" }, data: { status: "LOCKED" } });
    if (lock.count === 0) throw conflict("SLOT_CONFLICT", "Slot ini baru saja dipesan orang lain. Silakan pilih slot lain.");
    await tx.booking.update({ where: { id }, data: { slotId: newSlotId } });
    await tx.slot.update({ where: { id: b.slotId }, data: { status: "AVAILABLE" } });
  });
  return getBooking(clientId, id);
}

/** BR-17 [FA-38, FA-39, S6 term 2]: one review per completed booking; updates the expert's rating in the same transaction. */
export async function reviewBooking(clientId: string, id: string, rating: number, text?: string) {
  const b = await ownedBooking(clientId, id);
  if (b.status !== "COMPLETED") throw conflict("NOT_COMPLETED", "Ulasan bisa ditulis setelah sesi selesai.");
  if (b.review) throw conflict("ALREADY_REVIEWED", "Kamu sudah memberi ulasan untuk sesi ini.");
  await prisma.$transaction(async (tx) => {
    await tx.review.create({ data: { bookingId: id, expertId: b.expertId, rating, text: text?.trim() || null } });
    const e = await tx.expert.findUniqueOrThrow({ where: { id: b.expertId } });
    const count = e.ratingCount + 1;
    await tx.expert.update({ where: { id: e.id }, data: { ratingCount: count, ratingAvg: (e.ratingAvg * e.ratingCount + rating) / count } });
  });
  return getBooking(clientId, id);
}
