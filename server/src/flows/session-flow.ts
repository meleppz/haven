// SC-13 Layanan Sesi Konsultasi (task service): entry gate, consent, chat, closing, masking
// (S4 `bukaSesiKonsultasi`, `teruskanPesan`; S5 `teruskanProfilKlien`, `tutupSesiKonsultasi`;
// FA-26..37; BR-13..16, BR-19).
import { config } from "../config.js";
import { prisma } from "../db.js";
import { conflict, forbidden, notFound } from "../lib/errors.js";
import { parseList } from "../lib/json.js";
import { clock } from "../sim/clock.js";
import { ahli } from "../sim/ahli.js";
import { BOOKING_INCLUDE, joinState, toBookingDto } from "../services/bookings.js";

async function loadOwned(clientId: string, bookingId: string) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: BOOKING_INCLUDE });
  if (!b) throw notFound("Pemesanan");
  if (b.clientId !== clientId) throw forbidden("NOT_OWNER", "Sesi ini bukan milikmu.");
  return b;
}

/**
 * BR-13 session entry gate [FA-27, FA-28, S4 terms 1 and 4]. Allowed only when the caller owns the booking, it is PAID
 * (or already IN_SESSION) and `now` is within [start - 30 min, end]. Otherwise 403 NOT_OWNER | NOT_PAID | TOO_EARLY | ENDED.
 */
export async function joinSession(clientId: string, bookingId: string) {
  const b = await loadOwned(clientId, bookingId);
  const now = clock.now();

  if (b.status === "COMPLETED") throw forbidden("ENDED", "Sesi ini sudah berakhir.");
  if (b.status !== "PAID" && b.status !== "IN_SESSION") throw forbidden("NOT_PAID", "Selesaikan pembayaran dulu untuk masuk ke sesi ini.");
  const state = joinState(b.slot, now);
  if (state === "TOO_EARLY") throw forbidden("TOO_EARLY", "Ruang konsultasi baru bisa dimasuki 30 menit sebelum jadwal.");
  if (state === "ENDED") throw forbidden("ENDED", "Sesi ini sudah berakhir.");

  if (b.status === "PAID") {
    await prisma.booking.update({ where: { id: b.id }, data: { status: "IN_SESSION", joinedAt: now } }); // FA-32, FA-33
  }
  const expertConnectsInMs = ahli.onJoin(b.id);
  return {
    room: `haven-${b.id}`,
    mode: b.mode,
    endsAt: b.slot.endAt.toISOString(),
    e2eAccepted: b.e2eAcceptedAt !== null,
    expertConnectsInMs,
    serverNow: now.toISOString(),
  };
}

/** BR-14 / FA-26: the E2E consent is recorded once per booking. (UI only: no real encryption is claimed.) */
export async function recordConsent(clientId: string, bookingId: string, accepted: boolean) {
  const b = await loadOwned(clientId, bookingId);
  if (!accepted) throw conflict("CONSENT_REQUIRED", "Setujui informasi keamanan dulu untuk masuk ya.");
  if (b.status !== "PAID" && b.status !== "IN_SESSION") throw forbidden("NOT_PAID", "Selesaikan pembayaran dulu untuk masuk ke sesi ini.");
  if (!b.e2eAcceptedAt) await prisma.booking.update({ where: { id: b.id }, data: { e2eAcceptedAt: clock.now() } });
  return { e2eAccepted: true };
}

export async function sessionState(clientId: string, bookingId: string) {
  const b = await loadOwned(clientId, bookingId);
  const [lastClient, lastExpert] = await Promise.all([
    prisma.message.findFirst({ where: { bookingId, sender: "CLIENT" }, orderBy: { id: "desc" } }),
    prisma.message.findFirst({ where: { bookingId, sender: "EXPERT" }, orderBy: { id: "desc" } }),
  ]);
  return {
    status: b.status,
    mode: b.mode,
    endsAt: b.slot.endAt.toISOString(),
    joinedAt: b.joinedAt?.toISOString() ?? null,
    expertConnected: ahli.isConnected(b.id),
    // BR-19: the app shows the inactivity sheet when the newest client message is older than this with no expert reply.
    lastClientMessageAt: lastClient?.createdAt.toISOString() ?? null,
    lastExpertMessageAt: lastExpert?.createdAt.toISOString() ?? null,
    unresponsiveAfterSec: config.unresponsiveAfterSec,
    serverNow: clock.now().toISOString(),
  };
}

// ---- Chat (SC-08, FA-34) ----

const toMessageDto = (m: { id: number; sender: string; body: string | null; imagePath: string | null; readAt: Date | null; createdAt: Date }) => ({
  id: m.id,
  sender: m.sender,
  body: m.body,
  imagePath: m.imagePath,
  read: m.readAt !== null,
  createdAt: m.createdAt.toISOString(),
});

export async function sendMessage(clientId: string, bookingId: string, body: string) {
  const b = await loadOwned(clientId, bookingId);
  const now = clock.now();
  if (b.status === "COMPLETED") throw forbidden("ENDED", "Sesi ini sudah berakhir.");
  if (b.status !== "IN_SESSION") throw forbidden("NOT_JOINED", "Masuk ke ruang konsultasi dulu untuk mengirim pesan.");
  if (now > b.slot.endAt) {
    await closeSession(b.id, "timeout");
    throw forbidden("ENDED", "Sesi ini sudah berakhir.");
  }
  const m = await prisma.message.create({ data: { bookingId, sender: "CLIENT", body: body.trim(), createdAt: now } });
  ahli.onClientMessage(bookingId);
  return toMessageDto(m);
}

/** Polled every 2s by the app (`after` = last seen message id). Readable after the session as a read-only history. */
export async function listMessages(clientId: string, bookingId: string, after = 0) {
  const b = await loadOwned(clientId, bookingId);
  const rows = await prisma.message.findMany({ where: { bookingId, id: { gt: after } }, orderBy: { id: "asc" } });
  return { messages: rows.map(toMessageDto), status: b.status, endsAt: b.slot.endAt.toISOString(), serverNow: clock.now().toISOString() };
}

/** Chat list ("Pesan"): sessions that have messages or are live. */
export async function listChats(clientId: string) {
  const rows = await prisma.booking.findMany({
    where: { clientId, status: { in: ["IN_SESSION", "COMPLETED"] } },
    // The preview is the last real chat bubble (as in Figma L25); the closing SYSTEM line is not a message.
    include: { expert: true, slot: true, messages: { where: { sender: { not: "SYSTEM" } }, orderBy: { id: "desc" }, take: 1 } },
  });
  return rows
    // A finished session only appears if real chat bubbles were exchanged, so every row previews its last bubble.
    .filter((b) => b.status === "IN_SESSION" || b.messages.length > 0)
    .map((b) => {
      const last = b.messages[0];
      return {
        bookingId: b.id,
        expert: { id: b.expert.id, name: b.expert.name, photoUrl: b.expert.photoUrl },
        status: b.status === "IN_SESSION" ? ("AKTIF" as const) : ("SELESAI" as const),
        lastMessage: last?.body ?? null,
        lastAt: (last?.createdAt ?? b.slot.startAt).toISOString(),
      };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** BR-19: a stored report; the app decides when to offer it (see `sessionState`). */
export async function reportUnresponsive(clientId: string, bookingId: string) {
  const b = await loadOwned(clientId, bookingId);
  await prisma.report.create({ data: { clientId, bookingId: b.id, type: "UNRESPONSIVE", body: "Ahli tidak merespon" } });
  return { ok: true };
}

// ---- Closing (BR-16) ----

export const SESSION_ENDED_TEXT = "Sesi telah berakhir.";

/**
 * BR-16 [FA-35..37, S5 `tutupSesiKonsultasi`]: a session closes when the user ends it, when the Ahli simulator ends it,
 * or automatically at slot end. Saves COMPLETED + endedAt + durationMinutes, and the expert's notes. Idempotent.
 */
export async function closeSession(bookingId: string, closedBy: "client" | "expert" | "timeout") {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { ...BOOKING_INCLUDE, client: true } });
  if (!b) throw notFound("Pemesanan");
  if (b.status === "COMPLETED") return toBookingDto(b);
  if (b.status !== "IN_SESSION") throw conflict("NOT_IN_SESSION", "Sesi ini belum dimulai.");

  const now = clock.now();
  const endedAt = closedBy === "timeout" && now > b.slot.endAt ? b.slot.endAt : now;
  const joinedAt = b.joinedAt ?? endedAt;
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - joinedAt.getTime()) / 60_000));
  const note = ahli.buildNote({ description: b.description, concerns: parseList(b.client.concerns) });

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status: "COMPLETED", endedAt, durationMinutes } });
    await tx.sessionNote.upsert({ where: { bookingId }, create: { bookingId, ...note }, update: {} });
    await tx.message.create({
      // One wording however the session closed (user revision after Phase 6).
      data: { bookingId, sender: "SYSTEM", body: SESSION_ENDED_TEXT, createdAt: endedAt },
    });
  });
  ahli.clear(bookingId);
  return toBookingDto(await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: BOOKING_INCLUDE }), now);
}

export async function endSession(clientId: string, bookingId: string) {
  await loadOwned(clientId, bookingId);
  return closeSession(bookingId, "client");
}

// ---- Masking (BR-15) ----

/**
 * BR-15 [FA-29..31, S5 terms 1-2]: the profile forwarded to the expert contains the display name, age, occupation,
 * assessment categories and the booking description. When anonymous, the display name is
 * `client.displayName ?? "Anonim"` and the real name, email, phone and university are removed.
 * Only available for a scheduled (paid) booking.
 */
export async function clientProfileForExpert(bookingId: string) {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { client: { include: { user: true } } } });
  if (!b) throw notFound("Pemesanan");
  if (b.status !== "PAID" && b.status !== "IN_SESSION") throw forbidden("NOT_AVAILABLE", "Profil klien hanya tersedia untuk sesi yang sudah terjadwal dan dibayar.");
  const c = b.client;
  const profile = {
    displayName: b.anonymous ? (c.displayName ?? "Anonim") : c.name,
    age: c.age,
    occupation: c.occupation,
    concerns: parseList(c.concerns),
    description: b.description,
  };
  if (b.anonymous) return { anonymous: true, ...profile };
  return { anonymous: false, ...profile, name: c.name, email: c.user.email, phone: c.user.phone, university: c.university };
}
