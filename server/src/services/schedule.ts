// SC-03 Jadwal: slot visibility and availability queries (FA-08, FA-09; BR-05, BR-06).
import { prisma } from "../db.js";
import type { Slot } from "../generated/prisma/client.js";
import { addDays, isWeekend, parseWibDateKey, slotLabel, timeBucket, wibDateKey, type TimeBucket } from "../lib/time.js";
import { clock } from "../sim/clock.js";

export type SlotDto = { id: string; startAt: string; endAt: string; label: string; date: string };

export const toSlotDto = (s: Pick<Slot, "id" | "startAt" | "endAt">): SlotDto => ({
  id: s.id,
  startAt: s.startAt.toISOString(),
  endAt: s.endAt.toISOString(),
  label: slotLabel(s.startAt, s.endAt),
  date: wibDateKey(s.startAt),
});

/** BR-06: only future slots with status AVAILABLE are visible. */
export async function listFreeSlots(expertId: string, dateKey: string, opts: { timeOfDay?: TimeBucket; weekend?: boolean } = {}) {
  const dayStart = parseWibDateKey(dateKey);
  if (!dayStart) return null;
  const now = clock.now();
  const slots = await prisma.slot.findMany({
    where: { expertId, status: "AVAILABLE", startAt: { gt: now, gte: dayStart, lt: addDays(dayStart, 1) } },
    orderBy: { startAt: "asc" },
  });
  return slots.filter((s) => slotMatches(s, opts)).map(toSlotDto);
}

export function slotMatches(s: Pick<Slot, "startAt">, opts: { timeOfDay?: TimeBucket; weekend?: boolean }) {
  if (opts.timeOfDay && timeBucket(s.startAt) !== opts.timeOfDay) return false;
  if (opts.weekend && !isWeekend(s.startAt)) return false;
  return true;
}

/** Free future slots per expert within the next `days` days (for catalog filters, recommendations, nearest dates). */
export async function loadFreeSlots(days = 14, expertIds?: string[]) {
  const now = clock.now();
  const slots = await prisma.slot.findMany({
    where: {
      status: "AVAILABLE",
      startAt: { gt: now, lt: addDays(now, days) },
      ...(expertIds ? { expertId: { in: expertIds } } : {}),
    },
    orderBy: { startAt: "asc" },
  });
  const byExpert = new Map<string, Slot[]>();
  for (const s of slots) {
    const list = byExpert.get(s.expertId) ?? [];
    list.push(s);
    byExpert.set(s.expertId, list);
  }
  return byExpert;
}

/** The nearest `count` WIB dates that still have a free slot ("Jadwal Terdekat" chips). */
export function nearestDates(slots: Slot[], count = 3): string[] {
  const dates: string[] = [];
  for (const s of slots) {
    const k = wibDateKey(s.startAt);
    if (!dates.includes(k)) dates.push(k);
    if (dates.length === count) break;
  }
  return dates;
}
