// Formatting helpers (handoff Appendix C). All times shown to people are WIB (UTC+7, no DST), whatever the device zone.
const WIB_MS = 7 * 3_600_000;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** A Date whose UTC fields read as WIB wall-clock time. */
const wib = (iso: string | Date) => new Date(new Date(iso).getTime() + WIB_MS);
const pad = (n: number) => String(n).padStart(2, "0");

/** 300000 -> "Rp300.000" (dot thousands separator, no decimals, no space). Hermes' Intl is unreliable, so no Intl here. */
export const rupiah = (n: number) => `Rp${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

/** 300000 -> "300rb", 1200000 -> "1,2jt" (short price on the expert detail page). */
export const rupiahShort = (n: number) => {
  if (n >= 1_000_000) return `${(Math.round(n / 100_000) / 10).toString().replace(".", ",")}jt`;
  return n >= 1000 ? `${Math.round(n / 1000)}rb` : String(n);
};

/** "2026-10-11" -> "Okt 11" (the "Jadwal Terdekat" chips). */
export function dateChipLabel(key: string) {
  const [, m, d] = key.split("-").map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}`;
}

/** "10 Jan, 8.00 WIB" (Beranda schedule card). */
export function shortDateTime(iso: string) {
  const d = wib(iso);
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}, ${d.getUTCHours()}.${pad(d.getUTCMinutes())} WIB`;
}

/** "Dimulai dalam 10 menit" / "Konsultasi dalam 5 jam" / "Konsultasi dalam 7 hari" / "Sedang berlangsung". */
export function relativeSession(startsInMinutes: number, inProgress: boolean) {
  if (inProgress || startsInMinutes <= 0) return "Sedang berlangsung";
  if (startsInMinutes <= 60) return `Dimulai dalam ${startsInMinutes} menit`;
  if (startsInMinutes < 24 * 60) return `Konsultasi dalam ${Math.round(startsInMinutes / 60)} jam`;
  return `Konsultasi dalam ${Math.round(startsInMinutes / (24 * 60))} hari`;
}

/** "Hari ini, 09.10" / "Kemarin, 14.00" / "12 Nov 2026" (review cards; the hi-fi's "Yesterday, 14.60 PM" is a placeholder). */
export function relativeDate(iso: string, now: Date = new Date()) {
  const d = wib(iso);
  const n = wib(now);
  const dayDiff = Math.round((Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()) - Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) / 86_400_000);
  const time = `${pad(d.getUTCHours())}.${pad(d.getUTCMinutes())}`;
  if (dayDiff === 0) return `Hari ini, ${time}`;
  if (dayDiff === 1) return `Kemarin, ${time}`;
  return `${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Display label for a consultation mode. */
export const MODE_LABEL = { CHAT: "Chat", VOICE: "Voice Call", VIDEO: "Video Call" } as const;

const MONTH_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "23 November 2026" (WIB). */
export function longDate(iso: string) {
  const d = wib(iso);
  return `${d.getUTCDate()} ${MONTH_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "28/08/2026" (WIB): history cards and Detail Konsultasi. */
export function slashDate(iso: string) {
  const d = wib(iso);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** "20:20" (WIB): chat bubbles and the chat list. */
export function clockTime(iso: string) {
  const d = wib(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "YYYY-MM-DD" in WIB, to match booking.slot.date. */
export const wibDateKey = (iso: string | Date) => {
  const d = wib(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** 75 -> "01:15"; 3725 -> "1:02:05". Negative values show 00:00. */
export function duration(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const mm = pad(Math.floor((s % 3600) / 60));
  const ss = pad(s % 60);
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Mode label used on session and history cards ("Mode : Obrolan Chat"). */
export const MODE_LONG = { CHAT: "Obrolan Chat", VOICE: "Panggilan Suara", VIDEO: "Panggilan Video" } as const;
