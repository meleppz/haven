// SC-11 Layanan Pendaftaran (task service): recommendations (FA-06) and booking validation + atomic slot lock
// (S1 `validasiFormulirPendaftaran` + `pesanSlotKonsultasi`; FA-10..14; BR-04, BR-07, BR-08, BR-09, BR-14, BR-21).
import { CONCERN_SPECIALTIES, STUDENT_PATTERN } from "../constants.js";
import { config } from "../config.js";
import { prisma } from "../db.js";
import type { Mode } from "../generated/prisma/enums.js";
import { conflict, invalid, notFound } from "../lib/errors.js";
import { parseList } from "../lib/json.js";
import { addMinutes } from "../lib/time.js";
import { clock } from "../sim/clock.js";
import { BOOKING_INCLUDE, toBookingDto } from "../services/bookings.js";
import { toExpertSummary } from "../services/experts.js";
import { loadFreeSlots } from "../services/schedule.js";
import { sweepExpired } from "../services/sweeper.js";

/**
 * BR-04 [FA-06, SC-11 `susunRekomendasiAhli`].
 * score = 10 x matched specialties + ratingAvg + (free slot within 48h ? 2 : 0) + (student AND tarif <= 300.000 ? 2 : 0).
 * Top 5. Without an assessment: top-rated experts that have a free slot this week.
 */
export async function recommendExperts(clientId: string) {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const now = clock.now();
  const [experts, free] = await Promise.all([prisma.expert.findMany(), loadFreeSlots(7)]);
  const concerns = parseList(client.concerns);

  if (!client.assessmentDoneAt || concerns.length === 0) {
    return experts
      .filter((e) => (free.get(e.id)?.length ?? 0) > 0)
      .sort((a, b) => b.ratingAvg - a.ratingAvg)
      .slice(0, 5)
      .map((e) => ({ ...toExpertSummary(e, free.get(e.id)), score: e.ratingAvg, matchedSpecialties: [] as string[] }));
  }

  const wanted = new Set(concerns.flatMap((c) => CONCERN_SPECIALTIES[c] ?? []));
  const isStudent = STUDENT_PATTERN.test(client.occupation ?? "");
  const in48h = now.getTime() + 48 * 3_600_000;

  return experts
    .map((e) => {
      const matched = parseList(e.specialties).filter((s) => wanted.has(s));
      const slots = free.get(e.id) ?? [];
      const soon = slots.some((s) => s.startAt.getTime() <= in48h);
      const score = 10 * matched.length + e.ratingAvg + (soon ? 2 : 0) + (isStudent && e.tarif <= 300_000 ? 2 : 0);
      return { e, slots, matched, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ e, slots, matched, score }) => ({ ...toExpertSummary(e, slots), score: Math.round(score * 10) / 10, matchedSpecialties: matched }));
}

export type BookingInput = {
  expertId: string;
  slotId: string;
  mode: Mode;
  anonymous?: boolean;
  usePromo?: boolean;
  description?: string;
};

/**
 * Validate the form first (nothing is saved on failure), then lock the slot and create the booking in ONE transaction.
 * BR-08: `updateMany ... WHERE status = AVAILABLE` and `count === 0` => 409 SLOT_CONFLICT, so two concurrent requests
 * for the same slot produce exactly one 201 and one 409.
 */
export async function createBooking(clientId: string, input: BookingInput) {
  await sweepExpired(); // free any expired unpaid holds before checking availability (BR-09)
  const now = clock.now();
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const expert = await prisma.expert.findUnique({ where: { id: input.expertId } });
  if (!expert) throw notFound("Ahli");

  // ---- BR-07 validation (S1 term 2) ----
  const fields: Record<string, string> = {};
  if (!parseList(expert.modes).includes(input.mode)) fields.mode = "Mode ini tidak tersedia untuk ahli yang dipilih";
  if ((input.description ?? "").length > 500) fields.description = "Deskripsi maksimal 500 karakter";
  const slot = await prisma.slot.findUnique({ where: { id: input.slotId } });
  if (!slot || slot.expertId !== expert.id || slot.startAt <= now) fields.slotId = "Slot tidak tersedia, silakan pilih slot lain";
  if (Object.keys(fields).length) throw invalid("VALIDATION", "Ada isian yang perlu dicek lagi ya.", fields);

  // BR-21: settings provide the defaults when the app does not send the toggles.
  const usePromo = input.usePromo ?? (client.autoStudentPromo && client.studentStatus === "VERIFIED");
  const anonymous = input.anonymous ?? client.defaultAnonymous; // BR-14
  if (usePromo && client.studentStatus !== "VERIFIED") {
    throw invalid("PROMO_NOT_ELIGIBLE", "Verifikasi status mahasiswa dulu untuk memakai promo ini ya.");
  }

  // ---- BR-08 atomic lock + create ----
  const booking = await prisma.$transaction(async (tx) => {
    const lock = await tx.slot.updateMany({ where: { id: input.slotId, status: "AVAILABLE" }, data: { status: "LOCKED" } });
    if (lock.count === 0) throw conflict("SLOT_CONFLICT", "Slot ini baru saja dipesan orang lain. Silakan pilih slot lain.");
    return tx.booking.create({
      data: {
        clientId,
        expertId: expert.id,
        slotId: input.slotId,
        mode: input.mode,
        anonymous,
        usePromo,
        description: input.description?.trim() || null,
        status: "AWAITING_PAYMENT",
        holdExpiresAt: addMinutes(now, config.holdMinutes), // BR-09
      },
      include: BOOKING_INCLUDE,
    });
  });
  return toBookingDto(booking, now);
}
