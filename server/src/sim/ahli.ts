// "Ahli simulator" (handoff §10): plays the expert side. It connects after a short delay, answers chat messages with
// short, supportive Indonesian lines, can be silenced (to demo BR-19), and writes the post-session notes template.
// It never gives diagnoses.
import { randomInt } from "node:crypto";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { parseList } from "../lib/json.js";
import { clock } from "./clock.js";

const GENERIC = [
  "Terima kasih sudah cerita, aku dengerin ya.",
  "Boleh ceritakan lebih lanjut apa yang paling bikin kamu kepikiran?",
  "Itu pasti nggak mudah buat kamu. Pelan-pelan aja ya.",
  "Perasaanmu valid. Kamu nggak sendirian di sini.",
  "Kapan terakhir kali kamu merasa tenang? Apa yang lagi kamu lakukan saat itu?",
  "Makasih sudah mau terbuka. Menurutmu apa yang paling kamu butuhkan sekarang?",
];

const BY_CONCERN: Record<string, string[]> = {
  "Kesulitan Akademik": ["Tekanan akademik memang bisa terasa berat. Bagian mana yang paling bikin kamu kewalahan?"],
  "Beban Kerja Tinggi": ["Beban kerja yang tinggi bisa bikin capek banget. Gimana kamu biasanya istirahat?"],
  Overwhelmed: ["Kalau terasa terlalu banyak, kita bisa bahas satu hal dulu. Mana yang paling mendesak?"],
  Panik: ["Coba tarik napas pelan-pelan dulu ya. Aku di sini nemenin kamu."],
  Lelah: ["Lelah yang kamu rasakan itu nyata. Sudah berapa lama kamu merasa begini?"],
};

const SELF_CARE = [
  "Sisihkan waktu 10 menit setiap hari untuk bernapas pelan dan tenang tanpa gawai.",
  "Tulis satu hal kecil yang kamu syukuri atau berhasil kamu lakukan hari ini.",
  "Usahakan tidur dan bangun di jam yang sama supaya tubuhmu lebih pulih.",
  "Ceritakan perasaanmu ke satu orang yang kamu percaya, tidak perlu menunggu sempurna.",
  "Jalan kaki santai di luar ruangan beberapa menit bisa membantu pikiran lebih ringan.",
];

const pick = <T,>(list: T[]): T => list[randomInt(0, list.length)];
const between = (min: number, max: number) => randomInt(min, max + 1);

const unresponsive = new Set<string>();
const connectAt = new Map<string, number>(); // real-time ms when the "expert" shows as connected
const timers = new Set<NodeJS.Timeout>();

export const ahli = {
  /** On join, the expert "connects" after 2-4 seconds. Returns the delay so the app can show "Menghubungkan…". */
  onJoin(bookingId: string) {
    const ms = config.ahliEnabled ? between(2000, 4000) : 0;
    if (!connectAt.has(bookingId)) connectAt.set(bookingId, Date.now() + ms);
    return ms;
  },

  isConnected: (bookingId: string) => Date.now() >= (connectAt.get(bookingId) ?? Infinity),

  /** The `unresponsive` flag stops replies so the BR-19 sheet can be demoed. */
  setUnresponsive(bookingId: string, value: boolean) {
    if (value) unresponsive.add(bookingId);
    else unresponsive.delete(bookingId);
  },
  isUnresponsive: (bookingId: string) => unresponsive.has(bookingId),

  /** After a client message the expert replies 2-6 seconds later (unless silenced). */
  onClientMessage(bookingId: string) {
    if (!config.ahliEnabled || unresponsive.has(bookingId)) return;
    const t = setTimeout(() => {
      timers.delete(t);
      void ahli.replyNow(bookingId).catch(() => undefined);
    }, between(2000, 6000));
    t.unref?.();
    timers.add(t);
  },

  /** Writes one expert reply immediately and marks the client's messages as read. Used by the timer and by tests. */
  async replyNow(bookingId: string) {
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { client: true } });
    if (!b || b.status !== "IN_SESSION" || unresponsive.has(bookingId)) return null;
    const lines = [...parseList(b.client.concerns).flatMap((c) => BY_CONCERN[c] ?? []), ...GENERIC];
    const now = clock.now();
    await prisma.message.updateMany({ where: { bookingId, sender: "CLIENT", readAt: null }, data: { readAt: now } });
    return prisma.message.create({ data: { bookingId, sender: "EXPERT", body: pick(lines), createdAt: now } });
  },

  /** Template notes: the problem summary comes from the description/concerns, plus 2-3 gentle self-care suggestions. */
  buildNote(input: { description: string | null; concerns: string[] }) {
    const concerns = input.concerns.length ? input.concerns.join(", ").toLowerCase() : null;
    const parts = [
      input.description?.trim() ? input.description.trim() : null,
      concerns ? `Klien menyebut merasa ${concerns}.` : null,
    ].filter(Boolean);
    const summary = parts.length ? parts.join(" ") : "Klien berbagi cerita dan perasaannya dalam sesi ini.";
    const advice = [...SELF_CARE].sort(() => Math.random() - 0.5).slice(0, between(2, 3)).join(" ");
    return { summary, advice };
  },

  clear(bookingId: string) {
    unresponsive.delete(bookingId);
    connectAt.delete(bookingId);
  },

  /** Cancels timer-driven replies (test teardown / dev reset). */
  reset() {
    for (const t of timers) clearTimeout(t);
    timers.clear();
    unresponsive.clear();
    connectAt.clear();
  },
};
