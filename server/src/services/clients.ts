// SC-04 Klien: profile, assessment, settings, stats, student verification (BR-03, BR-11, BR-21; FA-04, FA-17).
import bcrypt from "bcryptjs";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { badRequest, conflict, invalid, notFound } from "../lib/errors.js";
import { parseList, toJsonList } from "../lib/json.js";
import { DAY_MS } from "../lib/time.js";
import { clock } from "../sim/clock.js";

async function loadClient(clientId: string) {
  const c = await prisma.client.findUnique({ where: { id: clientId }, include: { user: true } });
  if (!c) throw notFound("Akun");
  return c;
}

export async function getMe(clientId: string) {
  const c = await loadClient(clientId);
  return {
    id: c.id,
    name: c.name,
    username: c.username,
    displayName: c.displayName,
    email: c.user.email,
    phone: c.user.phone,
    avatarUrl: c.avatarUrl,
    age: c.age,
    occupation: c.occupation,
    concerns: parseList(c.concerns),
    concernNote: c.concernNote,
    assessmentDone: c.assessmentDoneAt !== null,
    studentStatus: c.studentStatus,
    university: c.university,
    studentVerifiedAt: c.studentVerifiedAt?.toISOString() ?? null,
    settings: { defaultAnonymous: c.defaultAnonymous, autoStudentPromo: c.autoStudentPromo },
    joinedAt: c.user.createdAt.toISOString(),
  };
}

export async function updateProfile(clientId: string, data: { name?: string; username?: string; displayName?: string | null; avatarUrl?: string | null }) {
  if (data.username) {
    const taken = await prisma.client.findFirst({ where: { username: data.username, NOT: { id: clientId } } });
    if (taken) throw conflict("USERNAME_TAKEN", "Username ini sudah dipakai, coba yang lain ya.");
  }
  await prisma.client.update({ where: { id: clientId }, data });
  return getMe(clientId);
}

export async function changePassword(clientId: string, current: string, next: string) {
  const c = await loadClient(clientId);
  // 422 with a field error (not 401): the person is signed in, only the field is wrong. A 401 would sign the app out.
  if (!(await bcrypt.compare(current, c.user.passwordHash))) {
    throw invalid("WRONG_PASSWORD", "Password lamamu belum cocok.", { currentPassword: "Password lamamu belum cocok" });
  }
  await prisma.user.update({ where: { id: c.userId }, data: { passwordHash: await bcrypt.hash(next, 10) } });
}

/** BR-03 / FA-04: optional, retakeable; the latest assessment wins. */
export async function saveAssessment(clientId: string, a: { age: number; occupation: string; concerns: string[]; note?: string }) {
  await prisma.client.update({
    where: { id: clientId },
    data: {
      age: a.age,
      occupation: a.occupation.trim(),
      concerns: toJsonList(a.concerns),
      concernNote: a.note?.trim() || null,
      assessmentDoneAt: clock.now(),
    },
  });
  return getMe(clientId);
}

/** BR-21. */
export async function updateSettings(clientId: string, s: { defaultAnonymous?: boolean; autoStudentPromo?: boolean }) {
  await prisma.client.update({ where: { id: clientId }, data: s });
  return (await getMe(clientId)).settings;
}

/** Counts for the Profil tiles: sessions done, distinct experts, days since joining. */
export async function getStats(clientId: string) {
  const c = await loadClient(clientId);
  const done = await prisma.booking.findMany({ where: { clientId, status: "COMPLETED" }, select: { expertId: true } });
  return {
    consultationCount: done.length,
    distinctExperts: new Set(done.map((b) => b.expertId)).size,
    daysJoined: Math.max(0, Math.floor((clock.now().getTime() - c.user.createdAt.getTime()) / DAY_MS)),
  };
}

// ---- Student verification (BR-11, FA-17) ----

export async function getVerification(clientId: string) {
  const c = await loadClient(clientId);
  return {
    status: c.studentStatus,
    university: c.university,
    verifiedAt: c.studentVerifiedAt?.toISOString() ?? null,
  };
}

/** Name, university, a document (<= 10 MB, jpg/png/pdf) and accepted S&K are required. Verification is done once. */
export async function submitVerification(
  clientId: string,
  input: { name: string; university: string; acceptTerms: boolean; proofPath?: string },
) {
  const c = await loadClient(clientId);
  if (c.studentStatus === "VERIFIED") throw conflict("ALREADY_VERIFIED", "Status mahasiswamu sudah terverifikasi.");
  const fields: Record<string, string> = {};
  if (!input.name.trim()) fields.name = "Nama wajib diisi";
  if (!input.university.trim()) fields.university = "Asal universitas wajib diisi";
  if (!input.proofPath) fields.proof = "Unggah 1 dokumen ya (KTM, Transkrip, atau Jadwal Kuliah)";
  if (!input.acceptTerms) fields.acceptTerms = "Centang persetujuan S&K dulu ya";
  if (Object.keys(fields).length) throw invalid("VALIDATION", "Ada isian yang perlu dicek lagi ya.", fields);

  await prisma.client.update({
    where: { id: clientId },
    data: { studentStatus: "PENDING", university: input.university.trim(), studentProofPath: input.proofPath },
  });
  // Simulated approval after ~2s (BR-11); the dev menu can approve instantly.
  const t = setTimeout(() => void approveStudent(clientId).catch(() => undefined), config.studentApproveMs);
  t.unref?.();
  return getVerification(clientId);
}

export async function approveStudent(clientId: string) {
  const c = await loadClient(clientId);
  if (c.studentStatus === "VERIFIED") return getVerification(clientId);
  if (c.studentStatus === "NONE") throw badRequest("NO_PENDING_VERIFICATION", "Belum ada pengajuan verifikasi.");
  await prisma.client.update({ where: { id: clientId }, data: { studentStatus: "VERIFIED", studentVerifiedAt: clock.now() } });
  return getVerification(clientId);
}

/** Dev shortcut: mark verified even without a prior submission. */
export async function forceVerifyStudent(clientId: string) {
  await prisma.client.update({
    where: { id: clientId },
    data: { studentStatus: "VERIFIED", studentVerifiedAt: clock.now(), university: (await loadClient(clientId)).university ?? "Institut Teknologi Bandung" },
  });
  return getVerification(clientId);
}

// ---- Account deletion (Figma modal "Hapus akun Haven?", added in Phase 6) ----

/**
 * Permanently removes the account and everything that belongs to it, in one transaction:
 * future/held bookings release their slots, the person's reviews are taken out of the experts' ratings,
 * then bookings (messages, notes, invoices, transactions, reviews), reports, the client and the user are deleted.
 * A session that is in progress blocks deletion (end it first).
 */
export async function deleteAccount(clientId: string) {
  const c = await loadClient(clientId);
  const bookings = await prisma.booking.findMany({ where: { clientId }, include: { review: true } });
  if (bookings.some((b) => b.status === "IN_SESSION")) {
    throw conflict("SESSION_IN_PROGRESS", "Akhiri sesi konsultasi yang sedang berjalan dulu sebelum menghapus akun.");
  }
  const ids = bookings.map((b) => b.id);
  const liveSlots = bookings.filter((b) => b.status === "PAID" || b.status === "AWAITING_PAYMENT").map((b) => b.slotId);

  await prisma.$transaction(async (tx) => {
    if (liveSlots.length) await tx.slot.updateMany({ where: { id: { in: liveSlots } }, data: { status: "AVAILABLE" } });
    // BR-17 bookkeeping: the expert's average stays consistent without this person's reviews.
    for (const b of bookings) {
      if (!b.review) continue;
      const e = await tx.expert.findUniqueOrThrow({ where: { id: b.review.expertId } });
      const count = Math.max(0, e.ratingCount - 1);
      const avg = count === 0 ? 0 : (e.ratingAvg * e.ratingCount - b.review.rating) / count;
      await tx.expert.update({ where: { id: e.id }, data: { ratingCount: count, ratingAvg: avg } });
    }
    await tx.message.deleteMany({ where: { bookingId: { in: ids } } });
    await tx.sessionNote.deleteMany({ where: { bookingId: { in: ids } } });
    await tx.review.deleteMany({ where: { bookingId: { in: ids } } });
    await tx.transaction.deleteMany({ where: { bookingId: { in: ids } } });
    await tx.invoice.deleteMany({ where: { bookingId: { in: ids } } });
    await tx.booking.deleteMany({ where: { clientId } });
    await tx.report.deleteMany({ where: { clientId } });
    await tx.client.delete({ where: { id: clientId } });
    await tx.user.delete({ where: { id: c.userId } });
  });
  return { ok: true as const };
}
