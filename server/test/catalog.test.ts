import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { seedDatabase } from "../src/seed/index.js";
import { auth, http, resetAll } from "./helpers.js";

type ExpertItem = { id: string; name: string; tarif: number; yearsExperience: number; type: string; nextSlotAt: string | null; ratingAvg: number; ratingCount: number; nearestDates: string[] };

const names = (items: ExpertItem[]) => items.map((e) => e.name.split(",")[0].replace("dr. ", ""));
const list = async (query: Record<string, string> = {}) => ((await http().get("/api/experts").query(query)).body.items as ExpertItem[]);

let demoToken = "";

beforeAll(async () => {
  await resetAll();
  await seedDatabase();
  demoToken = (await http().post("/api/auth/login").send({ identifier: "choso@haven.id", password: "haven123" })).body.token;
});

describe("seed data (handoff §11)", () => {
  it("has 8 experts with the specified tarif range and believable ratings", async () => {
    const items = await list();
    expect(items).toHaveLength(8);
    expect(Math.min(...items.map((e) => e.tarif))).toBe(120_000);
    expect(Math.max(...items.map((e) => e.tarif))).toBe(1_200_000);
    for (const e of items) {
      expect(e.ratingAvg).toBeGreaterThanOrEqual(3.5);
      expect(e.ratingAvg).toBeLessThanOrEqual(5);
      expect(e.ratingCount).toBeGreaterThanOrEqual(60);
      expect(e.nearestDates.length).toBeGreaterThan(0);
    }
    expect(items.find((e) => e.name.startsWith("Nadia"))!.ratingCount).toBeGreaterThanOrEqual(194);
  });

  it("generates 14 days of 60-minute slots with roughly 25% already taken", async () => {
    const slots = await prisma.slot.findMany({ where: { startAt: { gt: new Date() }, bookings: { none: {} } } });
    const locked = slots.filter((s) => s.status === "LOCKED").length;
    expect(slots.length).toBeGreaterThan(200);
    expect(locked / slots.length).toBeGreaterThan(0.1);
    expect(locked / slots.length).toBeLessThan(0.4);
    expect(slots.every((s) => s.endAt.getTime() - s.startAt.getTime() === 3_600_000)).toBe(true);
  });

  it("serves expert photos and the demo avatar", async () => {
    const nadia = (await list({ q: "nadia" }))[0] as ExpertItem & { photoUrl: string };
    expect(nadia.photoUrl).toBe("/static/photos/nadia.png");
    expect((await http().get(nadia.photoUrl)).headers["content-type"]).toContain("image/png");
    const me = await http().get("/api/me").set(auth(demoToken));
    expect(me.body.avatarUrl).toBe("/static/avatars/choso.png");
    expect((await http().get(me.body.avatarUrl)).status).toBe(200);
  });

  it("the demo client matches the spec", async () => {
    const me = await http().get("/api/me").set(auth(demoToken));
    expect(me.body).toMatchObject({ name: "Choso Kamo", username: "almchosokamo", age: 20, occupation: "Mahasiswa", studentStatus: "NONE", phone: "081234567890" });
    expect(me.body.concerns).toEqual(["Overwhelmed", "Kesulitan Akademik"]);
    const stats = await http().get("/api/me/stats").set(auth(demoToken));
    expect(stats.body).toEqual({ consultationCount: 2, distinctExperts: 2, daysJoined: 67 });
  });

  it("the demo client has the four seeded bookings, with a session that can be joined right away", async () => {
    const up = (await http().get("/api/me/bookings?scope=upcoming").set(auth(demoToken))).body.items;
    expect(up).toHaveLength(2);
    expect(up[0]).toMatchObject({ mode: "VIDEO", anonymous: true, status: "PAID", canJoin: true });
    expect(up[0].expert.name).toMatch(/^Nadia/);
    expect(up[0].startsInMinutes).toBeLessThanOrEqual(10);
    expect(up[1]).toMatchObject({ canJoin: false, mode: "VIDEO" });
    expect(up[1].expert.name).toMatch(/^Amerta/);

    const history = (await http().get("/api/me/bookings?scope=history").set(auth(demoToken))).body.items;
    expect(history.map((b: { expert: { name: string } }) => b.expert.name.split(",")[0])).toEqual(["Sekar Ayu", "Nadia"]);
    const nadia = history[1];
    expect(nadia.durationMinutes).toBe(30);
    expect(nadia.reviewed).toBe(true);
    expect(nadia.notes.summary).toBe("Merasa galau tentang hubungan dan sering merasa tidak disayang; sulit melepaskan.");
    expect(nadia.notes.advice).toContain("Lebih sayang terhadap diri sendiri");

    const search = (await http().get("/api/me/bookings?scope=history&q=sekar").set(auth(demoToken))).body.items;
    expect(search).toHaveLength(1);

    const join = await http().post(`/api/bookings/${up[0].id}/join`).set(auth(demoToken));
    expect(join.status).toBe(200);
  });

  it("chats list shows the completed sessions with their last message", async () => {
    const chats = (await http().get("/api/me/chats").set(auth(demoToken))).body.items;
    const done = chats.filter((c: { status: string }) => c.status === "SELESAI");
    expect(done).toHaveLength(2);
    expect(chats.some((c: { status: string }) => c.status === "AKTIF")).toBe(true); // the session joined in the previous test
  });
});

describe("catalog filters and sorting (BR-05)", () => {
  it("price range applies to tarif", async () => {
    const items = await list({ minPrice: "100000", maxPrice: "200000" });
    expect(names(items).sort()).toEqual(["Amerta", "Dewi Lestari", "Sekar Ayu"]);
    expect(items.every((e) => e.tarif >= 100_000 && e.tarif <= 200_000)).toBe(true);
  });

  it("category, specialty (any-of), search", async () => {
    expect(names(await list({ category: "Psikiater" }))).toEqual(["Rania Putri"]);
    expect(names(await list({ category: "Psikolog" }))).toHaveLength(7);
    expect(names(await list({ specialties: "ADHD" })).sort()).toEqual(["Bima Prasetya", "Nanami", "Rania Putri"]);
    expect(names(await list({ specialties: "Autisme,Anak" })).sort()).toEqual(["Bima Prasetya", "Nanami"]);
    expect(names(await list({ q: "adiksi" })).sort()).toEqual(["Nadia", "Rania Putri"]);
    expect(names(await list({ q: "yoga" }))).toEqual(["Yoga Aditya"]);
  });

  it("experience buckets 1-2, 2-5, >5", async () => {
    expect(names(await list({ experience: "1-2" })).sort()).toEqual(["Amerta", "Sekar Ayu"]);
    expect(names(await list({ experience: "2-5" })).sort()).toEqual(["Nadia", "Nanami"]);
    expect(names(await list({ experience: ">5" })).sort()).toEqual(["Bima Prasetya", "Dewi Lestari", "Rania Putri", "Yoga Aditya"]);
  });

  it("time windows need a free future slot inside them (evening, weekend)", async () => {
    const evening = names(await list({ timeOfDay: "Malam" }));
    expect(evening).toContain("Amerta");
    expect(evening).not.toContain("Bima Prasetya");
    expect(evening).not.toContain("Rania Putri");
    expect(names(await list({ timeOfDay: "Pagi" }))).toContain("Bima Prasetya");
    expect(names(await list({ weekend: "true" })).sort()).toEqual(["Amerta", "Nadia", "Sekar Ayu", "Yoga Aditya"]);
    expect(names(await list({ weekend: "true", timeOfDay: "Malam" }))).toEqual(expect.arrayContaining(["Amerta", "Yoga Aditya"]));
  });

  it("chips: 24/7, student promo, nearest schedule", async () => {
    expect(names(await list({ chips: "24x7" }))).toEqual(["Amerta"]);
    expect(await list({ chips: "student" })).toHaveLength(8);
    const nearest = await list({ chips: "nearest" });
    const times = nearest.map((e) => (e.nextSlotAt ? new Date(e.nextSlotAt).getTime() : Infinity));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("sorting", async () => {
    expect(names(await list({ sort: "price_desc" }))[0]).toBe("Rania Putri");
    expect(names(await list({ sort: "price_asc" }))[0]).toBe("Sekar Ayu");
    expect(names(await list({ sort: "experience" }))[0]).toBe("Rania Putri");
    const byRating = await list({ sort: "rating" });
    expect(byRating.map((e) => e.ratingAvg)).toEqual([...byRating.map((e) => e.ratingAvg)].sort((a, b) => b - a));
  });

  it("combined filters narrow the result", async () => {
    const items = await list({ category: "Psikolog", maxPrice: "250000", timeOfDay: "Malam", specialties: "Emosi", sort: "price_asc" });
    expect(names(items)).toEqual(["Sekar Ayu", "Amerta", "Dewi Lestari", "Nanami"]);
    expect(items.every((e) => e.tarif <= 250_000)).toBe(true);
  });

  it("rejects malformed filters", async () => {
    expect((await http().get("/api/experts?minPrice=abc")).status).toBe(422);
    expect((await http().get("/api/experts?sort=nonsense")).status).toBe(422);
  });
});

describe("expert detail, slots, reviews", () => {
  it("detail includes stats, license label and nearest dates", async () => {
    const nadia = (await list({ q: "nadia" }))[0];
    const res = await http().get(`/api/experts/${nadia.id}`);
    expect(res.body).toMatchObject({ licenseNo: "0417-21-2-1", verified: true, stats: { yearsExperience: 3 } });
    expect(res.body.specialtyInfo.Adiksi).toBeTruthy();
    expect(res.body.nearestDates.length).toBeLessThanOrEqual(3);
    expect((await http().get("/api/experts/nope")).status).toBe(404);
  });

  it("slots for a date are future, available, and labelled", async () => {
    const nadia = (await list({ q: "nadia" }))[0];
    const date = nadia.nearestDates[0];
    const res = await http().get(`/api/experts/${nadia.id}/slots`).query({ date });
    expect(res.status).toBe(200);
    expect(res.body.slots.length).toBeGreaterThan(0);
    for (const s of res.body.slots) {
      expect(s.label).toMatch(/^\d\d\.\d\d-\d\d\.\d\d$/);
      expect(s.date).toBe(date);
      expect(new Date(s.startAt).getTime()).toBeGreaterThan(Date.now());
    }
    expect((await http().get(`/api/experts/${nadia.id}/slots`).query({ date: "besok" })).status).toBe(422);
    expect((await http().get(`/api/experts/${nadia.id}/slots`).query({ date: "2020-01-01" })).body.slots).toEqual([]);
  });

  it("reviews are anonymous, newest first, and paginated by cursor", async () => {
    const nadia = (await list({ q: "nadia" }))[0];
    const first = await http().get(`/api/experts/${nadia.id}/reviews`);
    expect(first.body.items.length).toBeGreaterThanOrEqual(5);
    expect(first.body.items.every((r: { author: string }) => r.author === "Anonymous")).toBe(true);
    const dates = first.body.items.map((r: { createdAt: string }) => r.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(first.body.nextCursor).toBeNull(); // 5-9 reviews fit in one page of 10
  });
});

describe("recommendations (BR-04)", () => {
  it("rank by matched specialties for the demo assessment (Overwhelmed, Kesulitan Akademik)", async () => {
    const res = await http().get("/api/recommendations").set(auth(demoToken));
    const items = res.body.items as (ExpertItem & { score: number; matchedSpecialties: string[] })[];

    expect(items).toHaveLength(5);
    const scores = items.map((i) => i.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    // Emosi / Krisis Quarter-Life / ADHD are wanted: the experts matching two of them lead.
    for (const i of items.slice(0, 4)) expect(i.matchedSpecialties.length).toBe(2);
    expect(items[0].score).toBeGreaterThanOrEqual(20);
  });

  it("without an assessment: top-rated experts with a slot this week", async () => {
    const fresh = await http().post("/api/auth/register/start").send({ identifier: "baru@example.com" });
    expect(fresh.status).toBe(200);
    const v = await http().post("/api/auth/register/verify-otp").send({ identifier: "baru@example.com", code: "1234" });
    const done = await http().post("/api/auth/register/complete").send({ registrationToken: v.body.registrationToken, name: "Baru", password: "rahasia123" });

    const res = await http().get("/api/recommendations").set(auth(done.body.token));

    expect(res.body.items.length).toBeGreaterThan(0);
    const ratings = res.body.items.map((i: ExpertItem) => i.ratingAvg);
    expect(ratings).toEqual([...ratings].sort((a: number, b: number) => b - a));
    expect(res.body.items[0].matchedSpecialties).toEqual([]);
  });
});

describe("dev controls", () => {
  it("the clock can be advanced and reset; the server time is on every response", async () => {
    const before = new Date((await http().get("/api/health")).headers["x-server-now"]).getTime();
    await http().post("/api/dev/clock").send({ advanceMinutes: 30 });
    const after = new Date((await http().get("/api/health")).headers["x-server-now"]).getTime();
    expect(after - before).toBeGreaterThanOrEqual(30 * 60_000 - 2000);
    await http().post("/api/dev/clock").send({ reset: true });
    const reset = new Date((await http().get("/api/health")).headers["x-server-now"]).getTime();
    expect(Math.abs(reset - Date.now())).toBeLessThan(2000);
  });

  it("'start-soon' creates a paid session for the caller that can be joined", async () => {
    const res = await http().post("/api/dev/sessions/start-soon").set(auth(demoToken));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: "PAID", canJoin: true });
  });
});
