// Seed data (handoff §11). Every time is RELATIVE to seed time, so a fresh seed always demos well.
import bcrypt from "bcryptjs";
import { prisma as defaultDb } from "../db.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { Mode, SlotStatus } from "../generated/prisma/enums.js";
import { toJsonList } from "../lib/json.js";
import { addDays, addMinutes, DAY_MS, isWeekend, wibDayStart } from "../lib/time.js";
import { computePricing } from "../services/pricing.js";
import { clock } from "../sim/clock.js";

type Db = PrismaClient;

export async function resetDatabase(db: Db = defaultDb) {
  await db.message.deleteMany();
  await db.sessionNote.deleteMany();
  await db.review.deleteMany();
  await db.transaction.deleteMany();
  await db.invoice.deleteMany();
  await db.report.deleteMany();
  await db.booking.deleteMany();
  await db.slot.deleteMany();
  await db.expert.deleteMany();
  await db.client.deleteMany();
  await db.user.deleteMany();
}

type ExpertSeed = {
  key: string;
  type: "PSIKOLOG" | "PSIKIATER";
  name: string;
  licenseNo: string;
  bio: string;
  specialties: string[];
  modes: Mode[];
  tarif: number;
  years: number;
  hours: number;
  clients: number;
  baseRatings: number;
  available24x7?: boolean;
  weekday: number[]; // slot start hours (WIB) Mon-Fri
  weekend: number[]; // slot start hours (WIB) Sat-Sun
};

// Tarif values deliberately span the filter range (Rp50.000 - Rp2.000.000).
export const EXPERTS: ExpertSeed[] = [
  { key: "nadia", type: "PSIKOLOG", name: "Nadia, M.Psi.", licenseNo: "0417-21-2-1", bio: "Psikolog klinis yang mendampingi kecanduan, dinamika keluarga, dan gangguan makan dengan pendekatan hangat dan tanpa menghakimi.", specialties: ["Adiksi", "Keluarga", "Gangguan Makan", "Krisis Quarter-Life"], modes: ["CHAT", "VIDEO"], tarif: 300_000, years: 3, hours: 400, clients: 120, baseRatings: 194, weekday: [9, 10, 13, 14, 19, 20], weekend: [10, 11] },
  { key: "nanami", type: "PSIKOLOG", name: "Nanami, M.Psi., Psikolog", licenseNo: "1021-23-1-08", bio: "Berpengalaman mendampingi ADHD dan autisme, serta membantu mengelola emosi sehari-hari.", specialties: ["ADHD", "Autisme", "Emosi"], modes: ["CHAT", "VIDEO"], tarif: 250_000, years: 5, hours: 900, clients: 210, baseRatings: 120, weekday: [10, 11, 15, 16, 19, 20, 21], weekend: [] },
  { key: "dewi", type: "PSIKOLOG", name: "Dewi Lestari, M.Psi., Psikolog", licenseNo: "0733-19-4-22", bio: "Fokus pada hubungan pernikahan dan keluarga, dengan sesi yang tenang dan terstruktur.", specialties: ["Emosi", "Pernikahan", "Keluarga"], modes: ["VIDEO", "VOICE"], tarif: 200_000, years: 7, hours: 1500, clients: 340, baseRatings: 160, weekday: [8, 9, 14, 15, 16, 20, 21], weekend: [] },
  { key: "amerta", type: "PSIKOLOG", name: "Amerta, M.Psi., Psikolog", licenseNo: "1156-24-2-13", bio: "Tersedia kapan saja, termasuk larut malam, untuk kamu yang butuh teman bicara di waktu yang tidak biasa.", specialties: ["Emosi", "Gender", "Krisis Quarter-Life"], modes: ["CHAT", "VOICE", "VIDEO"], tarif: 150_000, years: 2, hours: 250, clients: 80, baseRatings: 85, available24x7: true, weekday: [8, 12, 16, 20, 22, 23], weekend: [9, 10, 20, 21, 22, 23] },
  { key: "sekar", type: "PSIKOLOG", name: "Sekar Ayu, M.Psi., Psikolog", licenseNo: "1248-25-1-31", bio: "Ramah untuk mahasiswa dan pekerja muda yang baru mulai konseling, dengan tarif yang bersahabat.", specialties: ["Emosi", "Krisis Quarter-Life"], modes: ["CHAT", "VIDEO"], tarif: 120_000, years: 1, hours: 120, clients: 45, baseRatings: 60, weekday: [13, 14, 15, 19, 20, 21], weekend: [10] },
  { key: "bima", type: "PSIKOLOG", name: "Bima Prasetya, M.Psi., Psikolog", licenseNo: "0612-18-3-47", bio: "Psikolog tumbuh kembang anak dan remaja, termasuk pendampingan ADHD.", specialties: ["Tumbuh Kembang", "Anak", "ADHD"], modes: ["VIDEO"], tarif: 350_000, years: 9, hours: 2100, clients: 480, baseRatings: 230, weekday: [9, 10, 11, 14, 15], weekend: [] },
  { key: "yoga", type: "PSIKOLOG", name: "Yoga Aditya, M.Psi., Psikolog", licenseNo: "0589-17-2-60", bio: "Membantu pasangan dan keluarga membangun komunikasi yang lebih sehat. Ada slot akhir pekan.", specialties: ["Pernikahan", "Keluarga"], modes: ["VIDEO", "VOICE"], tarif: 450_000, years: 6, hours: 1300, clients: 290, baseRatings: 140, weekday: [19, 20], weekend: [9, 10, 11, 14, 15, 16, 19, 20] },
  { key: "rania", type: "PSIKIATER", name: "dr. Rania Putri, Sp.KJ", licenseNo: "31.74.1.2019.0842", bio: "Psikiater yang menangani adiksi, gangguan emosi, dan ADHD, termasuk penanganan medis bila diperlukan.", specialties: ["Adiksi", "Emosi", "ADHD"], modes: ["VIDEO"], tarif: 1_200_000, years: 10, hours: 3200, clients: 760, baseRatings: 310, weekday: [10, 11, 14, 15, 16], weekend: [] },
];

const REVIEW_TEXTS: Record<number, string[]> = {
  5: [
    "Dengerin dengan sabar dan nggak menghakimi sama sekali. Aku jadi lebih lega setelah sesi.",
    "Penjelasannya jelas dan tenang. Langkah-langkah yang dikasih gampang dicoba sendiri.",
    "Sesi pertamaku dan langsung merasa aman buat cerita. Terima kasih banyak ya.",
    "Ramah banget dan benar-benar fokus ke ceritaku. Pasti akan booking lagi.",
    "Jadwalnya fleksibel dan sesinya nyaman. Rasanya seperti ngobrol sama teman yang paham.",
  ],
  4: [
    "Sesinya membantu, cuma waktunya terasa cepat habis. Tapi secara keseluruhan bagus.",
    "Cukup menenangkan dan saran-sarannya masuk akal. Semoga bisa lanjut sesi berikutnya.",
    "Enak diajak ngobrol, hanya saja sempat telat beberapa menit di awal sesi.",
  ],
  3: ["Lumayan membantu, tapi aku berharap ada saran yang lebih spesifik."],
};

/** Deterministic pseudo-random so a seed run is reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

let refCounter = 0;

/**
 * Inserts a booking in the given state with a matching (paid) invoice + transaction, so receipts and stats stay consistent.
 * Exported for the dev menu ("Buat sesi mulai 10 menit lagi") and tests.
 */
export async function createPaidBooking(
  db: Db,
  o: {
    clientId: string;
    expertId: string;
    startAt: Date;
    mode: Mode;
    anonymous?: boolean;
    usePromo?: boolean;
    description?: string | null;
    status?: "PAID" | "IN_SESSION" | "COMPLETED";
    slotId?: string;
    joinedAt?: Date;
    endedAt?: Date;
    durationMinutes?: number;
    e2eAcceptedAt?: Date;
  },
) {
  const expert = await db.expert.findUniqueOrThrow({ where: { id: o.expertId } });
  const slot = o.slotId
    ? await db.slot.update({ where: { id: o.slotId }, data: { status: "LOCKED" } })
    : await db.slot.create({ data: { expertId: o.expertId, startAt: o.startAt, endAt: addMinutes(o.startAt, 60), status: "LOCKED" } });
  const pricing = computePricing(expert.tarif, o.usePromo ?? false);
  const ref = `INV-SEED-${++refCounter}-${Date.now().toString(36).toUpperCase()}`;
  const booking = await db.booking.create({
    data: {
      clientId: o.clientId,
      expertId: o.expertId,
      slotId: slot.id,
      mode: o.mode,
      anonymous: o.anonymous ?? false,
      usePromo: o.usePromo ?? false,
      description: o.description ?? null,
      status: o.status ?? "PAID",
      joinedAt: o.joinedAt,
      endedAt: o.endedAt,
      durationMinutes: o.durationMinutes,
      e2eAcceptedAt: o.e2eAcceptedAt,
    },
  });
  await db.invoice.create({ data: { ref, bookingId: booking.id, method: "QRIS", amount: pricing.total, destination: `HAVEN.QRIS.${ref}.${pricing.total}`, status: "PAID", expiresAt: addMinutes(clock.now(), 15) } });
  await db.transaction.create({
    data: {
      bookingId: booking.id,
      invoiceRef: ref,
      method: "QRIS",
      tarif: pricing.tarif,
      adminFee: pricing.adminFee,
      discount: pricing.discount,
      total: pricing.total,
      paidAt: addMinutes(o.startAt, -60 * 24),
      receiptNo: `HVN-SEED-${refCounter}-${Math.floor(Math.random() * 1e5)}`,
    },
  });
  return booking;
}

export async function seedDatabase(db: Db = defaultDb, now: Date = clock.now()) {
  const rand = rng(20260101);
  const day0 = wibDayStart(now);

  // ---- experts + slots ----
  const experts = new Map<string, { id: string; slots: { id: string; startAt: Date }[] }>();
  for (const e of EXPERTS) {
    const row = await db.expert.create({
      data: {
        type: e.type,
        name: e.name,
        licenseNo: e.licenseNo,
        bio: e.bio,
        // Only Nadia has a real photo in the design; everyone else uses the design's placeholder until real photos arrive.
        photoUrl: e.key === "nadia" ? "/static/photos/nadia.png" : "/static/photos/placeholder.png",
        specialties: toJsonList(e.specialties),
        modes: toJsonList(e.modes),
        tarif: e.tarif,
        yearsExperience: e.years,
        counselingHours: e.hours,
        clientsHelped: e.clients,
        baseRatingCount: e.baseRatings,
        available24x7: e.available24x7 ?? false,
      },
    });
    const slots: { id: string; startAt: Date }[] = [];
    for (let d = 0; d < 14; d++) {
      const dayStart = addDays(day0, d);
      for (const h of isWeekend(addMinutes(dayStart, 12 * 60)) ? e.weekend : e.weekday) {
        const startAt = addMinutes(dayStart, h * 60);
        if (startAt <= now) continue;
        // About 25% are already taken so the calendar looks real.
        const status: SlotStatus = rand() < 0.25 ? "LOCKED" : "AVAILABLE";
        const s = await db.slot.create({ data: { expertId: row.id, startAt, endAt: addMinutes(startAt, 60), status } });
        slots.push({ id: s.id, startAt });
      }
    }
    experts.set(e.key, { id: row.id, slots });
  }

  // ---- demo client "Choso Kamo" (student NOT verified so the promo flow can be demoed) ----
  const demo = await db.user.create({
    data: {
      email: "choso@haven.id",
      phone: "081234567890",
      passwordHash: await bcrypt.hash("haven123", 10),
      createdAt: new Date(now.getTime() - 67 * DAY_MS),
      client: {
        create: {
          name: "Choso Kamo",
          username: "almchosokamo",
          avatarUrl: "/static/avatars/choso.png",
          age: 20,
          occupation: "Mahasiswa",
          concerns: toJsonList(["Overwhelmed", "Kesulitan Akademik"]),
          assessmentDoneAt: new Date(now.getTime() - 66 * DAY_MS),
        },
      },
    },
    include: { client: true },
  });
  const demoClient = demo.client!;

  // ---- reviewers (seed-only) so every expert has believable public reviews ----
  const reviewer = await db.user.create({
    data: { email: "reviewer@haven.id", passwordHash: await bcrypt.hash("reviewer-demo", 10), createdAt: new Date(now.getTime() - 200 * DAY_MS), client: { create: { name: "Reviewer Demo", username: "reviewerdemo" } } },
    include: { client: true },
  });
  for (const e of EXPERTS) {
    const id = experts.get(e.key)!.id;
    const count = 5 + Math.floor(rand() * 4); // 5-8
    for (let i = 0; i < count; i++) {
      const rating = rand() < 0.7 ? 5 : rand() < 0.85 ? 4 : 3;
      const texts = REVIEW_TEXTS[rating];
      const startAt = addMinutes(day0, -(i + 3) * 24 * 60 + 14 * 60); // 14:00 WIB, (i + 3) days ago
      const b = await createPaidBooking(db, { clientId: reviewer.client!.id, expertId: id, startAt, mode: "CHAT", status: "COMPLETED", joinedAt: startAt, endedAt: addMinutes(startAt, 45), durationMinutes: 45 });
      await db.review.create({ data: { bookingId: b.id, expertId: id, rating, text: texts[Math.floor(rand() * texts.length)], createdAt: addMinutes(startAt, 120) } });
    }
  }

  // ---- demo client's bookings ----
  const nadia = experts.get("nadia")!;
  const sekar = experts.get("sekar")!;
  const amerta = experts.get("amerta")!;

  // 1. COMPLETED with Nadia, chat, 30 min, ~2 months ago, with notes, a review and a short transcript.
  const t1 = addMinutes(day0, -60 * 24 * 60 + 14 * 60);
  const b1 = await createPaidBooking(db, { clientId: demoClient.id, expertId: nadia.id, startAt: t1, mode: "CHAT", description: "Merasa galau soal hubungan dan sulit melepaskan.", status: "COMPLETED", joinedAt: t1, endedAt: addMinutes(t1, 30), durationMinutes: 30, e2eAcceptedAt: t1 });
  await db.sessionNote.create({
    data: {
      bookingId: b1.id,
      summary: "Merasa galau tentang hubungan dan sering merasa tidak disayang; sulit melepaskan.",
      advice: "Lebih sayang terhadap diri sendiri. Mulai meminta bantuan orang lain untuk berbicara dengan pasangan terkait masalah ini.",
    },
  });
  await db.review.create({ data: { bookingId: b1.id, expertId: nadia.id, rating: 5, text: "Nyaman banget ceritanya, dikasih saran yang gampang dijalani.", createdAt: addMinutes(t1, 90) } });
  const chat: [("CLIENT" | "EXPERT"), string][] = [
    ["CLIENT", "Halo, kak. Aku lagi bingung banget sama hubunganku sekarang."],
    ["EXPERT", "Halo, terima kasih sudah mau cerita. Boleh ceritakan apa yang paling bikin kamu kepikiran?"],
    ["CLIENT", "Aku sering ngerasa nggak disayang, tapi sulit banget buat ngelepasin."],
    ["EXPERT", "Itu pasti berat. Perasaanmu valid, dan kamu nggak sendirian."],
    ["CLIENT", "Aku takut kalau lepas, aku bakal kesepian."],
    ["EXPERT", "Kita bahas pelan-pelan ya. Yang pertama, coba mulai dari menyayangi diri sendiri dulu."],
  ];
  for (const [i, [sender, body]] of chat.entries()) {
    await db.message.create({ data: { bookingId: b1.id, sender, body, readAt: addMinutes(t1, i * 4 + 1), createdAt: addMinutes(t1, i * 4 + 1) } });
  }

  // 2. COMPLETED with Sekar Ayu, chat, ~3 weeks ago, with notes.
  const t2 = addMinutes(day0, -21 * 24 * 60 + 20 * 60);
  const b2 = await createPaidBooking(db, { clientId: demoClient.id, expertId: sekar.id, startAt: t2, mode: "CHAT", description: "Tugas kuliah menumpuk dan sulit tidur.", status: "COMPLETED", joinedAt: t2, endedAt: addMinutes(t2, 28), durationMinutes: 28, e2eAcceptedAt: t2 });
  await db.sessionNote.create({
    data: {
      bookingId: b2.id,
      summary: "Tugas kuliah menumpuk sehingga merasa kewalahan dan sulit tidur di malam hari.",
      advice: "Pecah tugas menjadi bagian kecil dan kerjakan satu per satu. Usahakan tidur di jam yang sama setiap malam dan kurangi gawai sebelum tidur.",
    },
  });
  await db.message.create({ data: { bookingId: b2.id, sender: "CLIENT", body: "Aku kewalahan sama tugas dan susah tidur.", readAt: addMinutes(t2, 2), createdAt: addMinutes(t2, 1) } });
  await db.message.create({ data: { bookingId: b2.id, sender: "EXPERT", body: "Terima kasih sudah cerita. Kita coba urai pelan-pelan ya.", createdAt: addMinutes(t2, 3) } });

  // 3. PAID with Nadia, video, anonymous, starting 10 minutes after seed time so the join flow works immediately.
  await createPaidBooking(db, { clientId: demoClient.id, expertId: nadia.id, startAt: addMinutes(now, 10), mode: "VIDEO", anonymous: true, description: "Ingin mulai bercerita soal stres kuliah." });

  // 4. PAID with Amerta, video, in about 7 days, so cancel/reschedule can be demoed.
  const weekAhead = amerta.slots.find((s) => s.startAt.getTime() >= addDays(now, 7).getTime()) ?? amerta.slots[amerta.slots.length - 1];
  await createPaidBooking(db, { clientId: demoClient.id, expertId: amerta.id, startAt: weekAhead.startAt, slotId: weekAhead.id, mode: "VIDEO" });

  // ---- ratings from the reviews (the "baseRatingCount" lets cards show counts like 200) ----
  for (const e of EXPERTS) {
    const id = experts.get(e.key)!.id;
    const agg = await db.review.aggregate({ where: { expertId: id }, _avg: { rating: true }, _count: { rating: true } });
    await db.expert.update({ where: { id }, data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count.rating + e.baseRatings } });
  }

  return { demoClientId: demoClient.id, demoUserEmail: "choso@haven.id", expertIds: Object.fromEntries([...experts].map(([k, v]) => [k, v.id])) };
}
