// SC-02 Ahli: catalog, filters, detail and reviews (BR-05, BR-06, BR-17; FA-05, FA-07, FA-09).
import { SPECIALTY_INFO } from "../constants.js";
import { prisma } from "../db.js";
import type { Expert, Slot } from "../generated/prisma/client.js";
import { notFound } from "../lib/errors.js";
import { parseList } from "../lib/json.js";
import { wibDateKey, type TimeBucket } from "../lib/time.js";
import { clock } from "../sim/clock.js";
import { loadFreeSlots, nearestDates, slotMatches } from "./schedule.js";

// Handoff §13 #6: the glossary says a Psikolog holds a SIPP and a Psikiater an STR (the hi-fi shows "STR" for both).
// Labels are returned by type so the UI can change them in one line once the team confirms.
const licenseLabel = (t: Expert["type"]) => (t === "PSIKOLOG" ? "SIPP" : "STR");
const licenseAuthority = (t: Expert["type"]) => (t === "PSIKOLOG" ? "HIMPSI" : "KKI");

export function toExpertSummary(e: Expert, freeSlots: Slot[] = []) {
  return {
    id: e.id,
    type: e.type,
    name: e.name,
    licenseNo: e.licenseNo,
    licenseLabel: licenseLabel(e.type),
    licenseAuthority: licenseAuthority(e.type),
    photoUrl: e.photoUrl,
    specialties: parseList(e.specialties),
    modes: parseList(e.modes),
    tarif: e.tarif,
    yearsExperience: e.yearsExperience,
    ratingAvg: Math.round(e.ratingAvg * 10) / 10,
    ratingCount: e.ratingCount,
    available24x7: e.available24x7,
    acceptsStudentPromo: e.acceptsStudentPromo,
    verified: true,
    nearestDates: nearestDates(freeSlots, 3),
    nextSlotAt: freeSlots[0]?.startAt.toISOString() ?? null,
  };
}

export type CatalogFilters = {
  q?: string;
  category?: "Semua" | "Psikolog" | "Psikiater";
  specialties?: string[];
  minPrice?: number;
  maxPrice?: number;
  experience?: string; // "Semua" | "1-2" | "2-5" | ">5"
  timeOfDay?: TimeBucket;
  weekend?: boolean;
  availableToday?: boolean;
  sort?: "price_desc" | "price_asc" | "experience" | "rating";
  chips?: string[]; // "24x7" | "nearest" | "student"
};

/** BR-05: experience buckets are 1-2, 2-5 (exclusive of 2) and >5 years. */
function experienceMatches(years: number, bucket?: string) {
  switch (bucket) {
    case "1-2": return years >= 1 && years <= 2;
    case "2-5": return years > 2 && years <= 5;
    case ">5":
    case "5+": return years > 5;
    default: return true;
  }
}

export async function listExperts(f: CatalogFilters) {
  const now = clock.now();
  const [experts, freeByExpert] = await Promise.all([prisma.expert.findMany(), loadFreeSlots(14)]);
  const todayKey = wibDateKey(now);
  const chips = new Set(f.chips ?? []);
  const q = f.q?.trim().toLowerCase();

  let rows = experts.filter((e) => {
    const specialties = parseList(e.specialties);
    const free = freeByExpert.get(e.id) ?? [];
    if (q && !(e.name.toLowerCase().includes(q) || specialties.some((s) => s.toLowerCase().includes(q)))) return false;
    if (f.category === "Psikolog" && e.type !== "PSIKOLOG") return false;
    if (f.category === "Psikiater" && e.type !== "PSIKIATER") return false;
    // Specialty matching is any-of.
    if (f.specialties?.length && !f.specialties.some((s) => specialties.includes(s))) return false;
    if (f.minPrice !== undefined && e.tarif < f.minPrice) return false;
    if (f.maxPrice !== undefined && e.tarif > f.maxPrice) return false;
    if (!experienceMatches(e.yearsExperience, f.experience)) return false;
    // An expert matches a time window when at least one free future slot (next 14 days) falls inside it.
    if ((f.timeOfDay || f.weekend) && !free.some((s) => slotMatches(s, { timeOfDay: f.timeOfDay, weekend: f.weekend }))) return false;
    if (f.availableToday && !free.some((s) => wibDateKey(s.startAt) === todayKey)) return false;
    if (chips.has("24x7") && !e.available24x7) return false;
    if (chips.has("student") && !e.acceptsStudentPromo) return false;
    return true;
  });

  const sort = f.sort ?? "rating";
  const earliest = (e: Expert) => freeByExpert.get(e.id)?.[0]?.startAt.getTime() ?? Infinity;
  rows = rows.sort((a, b) => {
    if (chips.has("nearest")) return earliest(a) - earliest(b);
    switch (sort) {
      case "price_desc": return b.tarif - a.tarif;
      case "price_asc": return a.tarif - b.tarif;
      case "experience": return b.yearsExperience - a.yearsExperience;
      default: return b.ratingAvg - a.ratingAvg || a.tarif - b.tarif;
    }
  });

  return rows.map((e) => toExpertSummary(e, freeByExpert.get(e.id)));
}

export async function getExpert(id: string) {
  const e = await prisma.expert.findUnique({ where: { id } });
  if (!e) throw notFound("Ahli");
  const free = (await loadFreeSlots(30, [id])).get(id) ?? [];
  const specialties = parseList(e.specialties);
  return {
    ...toExpertSummary(e, free),
    bio: e.bio,
    stats: { counselingHours: e.counselingHours, yearsExperience: e.yearsExperience, clientsHelped: e.clientsHelped },
    specialtyInfo: Object.fromEntries(specialties.map((s) => [s, SPECIALTY_INFO[s] ?? ""])),
  };
}

/** BR-17: public review cards always show the author as "Anonymous". Cursor = review id. */
export async function listReviews(expertId: string, cursor?: string, take = 10) {
  if (!(await prisma.expert.findUnique({ where: { id: expertId }, select: { id: true } }))) throw notFound("Ahli");
  const rows = await prisma.review.findMany({
    where: { expertId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, take);
  return {
    items: page.map((r) => ({ id: r.id, author: "Anonymous", rating: r.rating, text: r.text, createdAt: r.createdAt.toISOString() })),
    nextCursor: rows.length > take ? page[page.length - 1].id : null,
  };
}
