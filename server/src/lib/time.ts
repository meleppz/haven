// All times are WIB (Asia/Jakarta, UTC+7, no DST). Dates are stored as UTC instants (BR-06).
const WIB_MS = 7 * 3_600_000;
export const DAY_MS = 86_400_000;
export const MIN_MS = 60_000;

const shifted = (d: Date) => new Date(d.getTime() + WIB_MS);

export const wibDayStart = (d: Date) => new Date(Math.floor((d.getTime() + WIB_MS) / DAY_MS) * DAY_MS - WIB_MS);
export const wibHour = (d: Date) => shifted(d).getUTCHours();
export const wibDow = (d: Date) => shifted(d).getUTCDay(); // 0 = Sunday
export const wibDateKey = (d: Date) => shifted(d).toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
export const addMinutes = (d: Date, n: number) => new Date(d.getTime() + n * MIN_MS);

/** "2026-11-24" (WIB calendar date) -> start of that day as a UTC instant. */
export function parseWibDateKey(key: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const t = Date.parse(`${key}T00:00:00Z`);
  return Number.isNaN(t) ? null : new Date(t - WIB_MS);
}

export type TimeBucket = "Pagi" | "Siang" | "Malam";

/** BR-05: Pagi 06:00-11:59, Siang 12:00-17:59, Malam 18:00-23:59 (WIB). 00:00-05:59 belongs to no bucket. */
export function timeBucket(d: Date): TimeBucket | null {
  const h = wibHour(d);
  if (h >= 6 && h < 12) return "Pagi";
  if (h >= 12 && h < 18) return "Siang";
  if (h >= 18) return "Malam";
  return null;
}

export const isWeekend = (d: Date) => [0, 6].includes(wibDow(d));

const hhmm = (d: Date, isEnd = false) => {
  const s = shifted(d);
  const h = s.getUTCHours();
  const m = s.getUTCMinutes();
  if (isEnd && h === 0 && m === 0) return "24.00";
  return `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
};

/** "14.00-15.00" (the SlotChip label). */
export const slotLabel = (start: Date, end: Date) => `${hhmm(start)}-${hhmm(end, true)}`;
