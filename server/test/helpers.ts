import bcrypt from "bcryptjs";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import type { Mode } from "../src/generated/prisma/enums.js";
import { toJsonList } from "../src/lib/json.js";
import { addMinutes } from "../src/lib/time.js";
import { signToken } from "../src/middleware/auth.js";
import { resetDatabase } from "../src/seed/index.js";
import { ahli } from "../src/sim/ahli.js";
import { clock } from "../src/sim/clock.js";
import { setWebhookSender } from "../src/sim/gateway.js";

export const app = createApp();
export const http = () => supertest(app);

/** Clean database + clock + simulators; gateway callbacks go straight to the app (no network port). */
export async function resetAll() {
  ahli.reset();
  clock.reset();
  await resetDatabase();
  setWebhookSender(async (payload) => {
    await supertest(app).post("/api/webhooks/payment").send(payload);
  });
}

let n = 0;

export async function createClient(o: { verified?: boolean; name?: string; anonymousDefault?: boolean; occupation?: string; concerns?: string[]; email?: string } = {}) {
  const id = ++n; // capture before awaiting: tests create clients concurrently
  const user = await prisma.user.create({
    data: {
      email: o.email ?? `client${id}@test.id`,
      passwordHash: await bcrypt.hash("password123", 4),
      client: {
        create: {
          name: o.name ?? `Klien ${id}`,
          username: `klien${id}`,
          age: 21,
          occupation: o.occupation ?? "Mahasiswa",
          concerns: o.concerns ? toJsonList(o.concerns) : null,
          assessmentDoneAt: o.concerns ? new Date() : null,
          studentStatus: o.verified ? "VERIFIED" : "NONE",
          studentVerifiedAt: o.verified ? new Date() : null,
          university: o.verified ? "ITB" : null,
          defaultAnonymous: o.anonymousDefault ?? false,
        },
      },
    },
    include: { client: true },
  });
  return { userId: user.id, clientId: user.client!.id, token: signToken(user.id), email: user.email! };
}

export async function createExpert(o: { tarif?: number; modes?: Mode[]; name?: string; specialties?: string[]; years?: number; type?: "PSIKOLOG" | "PSIKIATER"; h24?: boolean; rating?: number; ratingCount?: number } = {}) {
  const id = ++n;
  return prisma.expert.create({
    data: {
      type: o.type ?? "PSIKOLOG",
      name: o.name ?? `Ahli ${id}, M.Psi.`,
      licenseNo: `LIC-${id}`,
      specialties: toJsonList(o.specialties ?? ["Emosi"]),
      modes: toJsonList(o.modes ?? ["CHAT", "VIDEO"]),
      tarif: o.tarif ?? 150_000,
      yearsExperience: o.years ?? 3,
      counselingHours: 100,
      clientsHelped: 20,
      available24x7: o.h24 ?? false,
      ratingAvg: o.rating ?? 0,
      ratingCount: o.ratingCount ?? 0,
    },
  });
}

export const createSlot = (expertId: string, startAt: Date, status: "AVAILABLE" | "LOCKED" = "AVAILABLE") =>
  prisma.slot.create({ data: { expertId, startAt, endAt: addMinutes(startAt, 60), status } });

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Books through the real API. */
export async function book(token: string, body: Record<string, unknown>) {
  return http().post("/api/bookings").set(auth(token)).send(body);
}
