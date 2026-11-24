// Simulation controls (handoff §10). Mounted only when DEMO_MODE=1.
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { closeSession } from "../flows/session-flow.js";
import { notFound } from "../lib/errors.js";
import { addMinutes } from "../lib/time.js";
import { parse } from "../lib/validate.js";
import { authOf, requireAuth } from "../middleware/auth.js";
import { forceVerifyStudent } from "../services/clients.js";
import { ahli } from "../sim/ahli.js";
import { clock } from "../sim/clock.js";
import { simulatePayment } from "../sim/gateway.js";
import { createPaidBooking, resetDatabase, seedDatabase } from "../seed/index.js";
import { toBookingDto, BOOKING_INCLUDE } from "../services/bookings.js";

export const devRouter = Router();

/** Simulated clock: { offsetMinutes } | { advanceMinutes } | { reset: true }. */
devRouter.post("/clock", (req, res) => {
  const b = parse(z.object({ offsetMinutes: z.number().optional(), advanceMinutes: z.number().optional(), reset: z.boolean().optional() }), req.body ?? {});
  if (b.reset) clock.reset();
  if (b.offsetMinutes !== undefined) clock.setOffsetMinutes(b.offsetMinutes);
  if (b.advanceMinutes !== undefined) clock.advanceMinutes(b.advanceMinutes);
  res.json({ serverNow: clock.now().toISOString() });
});

/** Reset and reseed the database. Existing tokens stop working: sign in again afterwards. */
devRouter.post("/reset", async (_req, res) => {
  ahli.reset();
  clock.reset();
  await resetDatabase();
  const seeded = await seedDatabase();
  res.json({ ok: true, demoLogin: { identifier: seeded.demoUserEmail, password: "haven123" }, serverNow: clock.now().toISOString() });
});

/** Pay or fail an invoice as the customer would outside Haven; the gateway then calls Haven's webhook over HTTP. */
devRouter.post("/gateway/:ref/pay", async (req, res) => {
  const b = parse(z.object({ outcome: z.enum(["success", "fail"]) }), req.body);
  res.json(await simulatePayment(String(req.params.ref), b.outcome));
});

devRouter.post("/me/verify-student", requireAuth, async (req, res) => {
  res.json(await forceVerifyStudent(authOf(req).clientId));
});

/** "Buat sesi mulai 10 menit lagi": a PAID video booking for the caller. */
devRouter.post("/sessions/start-soon", requireAuth, async (req, res) => {
  const expert = (await prisma.expert.findFirst({ where: { name: { startsWith: "Nadia" } } })) ?? (await prisma.expert.findFirstOrThrow());
  const b = await createPaidBooking(prisma, { clientId: authOf(req).clientId, expertId: expert.id, startAt: addMinutes(clock.now(), 10), mode: "VIDEO" });
  res.status(201).json(toBookingDto(await prisma.booking.findUniqueOrThrow({ where: { id: b.id }, include: BOOKING_INCLUDE })));
});

devRouter.post("/sessions/:id/expert-end", async (req, res) => {
  res.json(await closeSession(String(req.params.id), "expert"));
});

/** Silence (or restore) the expert so the BR-19 inactivity sheet can be demoed. */
devRouter.post("/sessions/:id/unresponsive", async (req, res) => {
  const b = parse(z.object({ value: z.boolean() }), req.body);
  const id = String(req.params.id);
  if (!(await prisma.booking.findUnique({ where: { id }, select: { id: true } }))) throw notFound("Pemesanan");
  ahli.setUnresponsive(id, b.value);
  res.json({ unresponsive: ahli.isUnresponsive(id) });
});
