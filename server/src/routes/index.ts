// HTTP layer (handoff §9). Base URL /api, JSON everywhere except the student proof upload (multipart).
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { CONCERNS } from "../constants.js";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { createInvoice, handlePaymentWebhook, paymentStatus, paymentSummary, receipt } from "../flows/payment-flow.js";
import { createBooking, recommendExperts } from "../flows/registration-flow.js";
import * as session from "../flows/session-flow.js";
import { forbidden, invalid, notFound } from "../lib/errors.js";
import { parse } from "../lib/validate.js";
import { authOf, requireAuth } from "../middleware/auth.js";
import * as authSvc from "../services/auth.js";
import * as bookings from "../services/bookings.js";
import * as clients from "../services/clients.js";
import * as experts from "../services/experts.js";
import { listFreeSlots } from "../services/schedule.js";
import { clock } from "../sim/clock.js";
import { devRouter } from "./dev.js";

export const api = Router();

const bool = z.string().transform((v) => v === "true" || v === "1");
const list = z.string().transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean));
const ISO_NOW = () => clock.now().toISOString();

// ---------------------------------------------------------------- auth (BR-02)
api.post("/auth/register/start", async (req, res) => {
  const { identifier } = parse(z.object({ identifier: z.string() }), req.body);
  res.json(await authSvc.startRegistration(identifier));
});

api.post("/auth/register/verify-otp", async (req, res) => {
  const b = parse(z.object({ identifier: z.string(), code: z.string() }), req.body);
  res.json(await authSvc.verifyOtp(b.identifier, b.code));
});

api.post("/auth/register/complete", async (req, res) => {
  const b = parse(
    z.object({
      registrationToken: z.string(),
      name: z.string().trim().min(2, "Nama minimal 2 karakter ya").max(50, "Nama maksimal 50 karakter"),
      password: z.string().min(8, "Password minimal 8 karakter ya"),
    }),
    req.body,
  );
  res.status(201).json(await authSvc.completeRegistration(b.registrationToken, b.name, b.password));
});

api.post("/auth/login", async (req, res) => {
  const b = parse(z.object({ identifier: z.string(), password: z.string() }), req.body);
  res.json(await authSvc.login(b.identifier, b.password));
});

api.get("/auth/google/accounts", (_req, res) => {
  res.json({ accounts: authSvc.mockGoogleAccounts });
});

api.post("/auth/google", async (req, res) => {
  const { mockAccountId } = parse(z.object({ mockAccountId: z.string() }), req.body);
  res.json(await authSvc.googleSignIn(mockAccountId));
});

// ---------------------------------------------------------------- catalog (public, read-only)
api.get("/experts", async (req, res) => {
  const q = parse(
    z.object({
      q: z.string().optional(),
      category: z.enum(["Semua", "Psikolog", "Psikiater"]).optional(),
      specialties: list.optional(),
      minPrice: z.coerce.number().int().min(0).optional(),
      maxPrice: z.coerce.number().int().min(0).optional(),
      experience: z.enum(["Semua", "1-2", "2-5", ">5", "5+"]).optional(),
      timeOfDay: z.enum(["Pagi", "Siang", "Malam"]).optional(),
      weekend: bool.optional(),
      availableToday: bool.optional(),
      sort: z.enum(["price_desc", "price_asc", "experience", "rating"]).optional(),
      chips: list.optional(),
    }),
    req.query,
  );
  res.json({ items: await experts.listExperts(q), serverNow: ISO_NOW() });
});

api.get("/experts/:id", async (req, res) => {
  res.json(await experts.getExpert(String(req.params.id)));
});

api.get("/experts/:id/slots", async (req, res) => {
  const q = parse(z.object({ date: z.string(), timeOfDay: z.enum(["Pagi", "Siang", "Malam"]).optional(), weekend: bool.optional() }), req.query);
  const id = String(req.params.id);
  if (!(await prisma.expert.findUnique({ where: { id }, select: { id: true } }))) throw notFound("Ahli");
  const slots = await listFreeSlots(id, q.date, { timeOfDay: q.timeOfDay, weekend: q.weekend });
  if (!slots) throw invalid("VALIDATION", "Format tanggal belum sesuai (YYYY-MM-DD).", { date: "Format tanggal belum sesuai" });
  res.json({ date: q.date, slots, serverNow: ISO_NOW() });
});

api.get("/experts/:id/reviews", async (req, res) => {
  const q = parse(z.object({ cursor: z.string().optional() }), req.query);
  res.json(await experts.listReviews(String(req.params.id), q.cursor));
});

// ---------------------------------------------------------------- payment webhook (called by the mock gateway, S3)
api.post("/webhooks/payment", async (req, res) => {
  const b = parse(z.object({ invoiceRef: z.string(), status: z.enum(["PAID", "FAILED"]) }), req.body);
  res.json(await handlePaymentWebhook(b.invoiceRef));
});

// ---------------------------------------------------------------- simulation controls (DEMO_MODE only; they authenticate themselves where needed)
if (config.demoMode) api.use("/dev", devRouter);

// ---------------------------------------------------------------- everything below needs a signed-in client (BR-01)
api.use(requireAuth);

api.get("/recommendations", async (req, res) => {
  res.json({ items: await recommendExperts(authOf(req).clientId) });
});

// ---- me
api.get("/me", async (req, res) => {
  res.json(await clients.getMe(authOf(req).clientId));
});

api.patch("/me", async (req, res) => {
  const b = parse(
    z.object({
      name: z.string().trim().min(2, "Nama minimal 2 karakter ya").max(50).optional(),
      username: z.string().trim().min(3, "Username minimal 3 karakter").max(30).regex(/^[a-z0-9_.]+$/i, "Username hanya boleh huruf, angka, titik, dan garis bawah").optional(),
      displayName: z.string().trim().max(30).nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
    }),
    req.body,
  );
  res.json(await clients.updateProfile(authOf(req).clientId, b));
});

api.post("/me/password", async (req, res) => {
  const b = parse(z.object({ currentPassword: z.string(), newPassword: z.string().min(8, "Password minimal 8 karakter ya") }), req.body);
  await clients.changePassword(authOf(req).clientId, b.currentPassword, b.newPassword);
  res.json({ ok: true });
});

api.put("/me/assessment", async (req, res) => {
  const b = parse(
    z.object({
      age: z.number().int().min(13, "Usia minimal 13 tahun").max(100, "Usia maksimal 100 tahun"),
      occupation: z.string().trim().min(1, "Pekerjaan wajib diisi"),
      concerns: z.array(z.enum(CONCERNS)).min(1, "Pilih minimal satu ya"),
      note: z.string().max(500, "Maksimal 500 karakter").optional(),
    }),
    req.body,
  );
  res.json(await clients.saveAssessment(authOf(req).clientId, b));
});

api.get("/me/stats", async (req, res) => {
  res.json(await clients.getStats(authOf(req).clientId));
});

api.patch("/me/settings", async (req, res) => {
  const b = parse(z.object({ defaultAnonymous: z.boolean().optional(), autoStudentPromo: z.boolean().optional() }), req.body);
  res.json(await clients.updateSettings(authOf(req).clientId, b));
});

// Student proof: jpg/png/pdf, max 10 MB (BR-11).
mkdirSync(config.uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "application/pdf"].includes(file.mimetype)) cb(null, true);
    else cb(invalid("INVALID_FILE_TYPE", "Format dokumen belum didukung, gunakan JPG, PNG, atau PDF ya.", { proof: "Gunakan JPG, PNG, atau PDF" }));
  },
});

api.get("/me/student-verification", async (req, res) => {
  res.json(await clients.getVerification(authOf(req).clientId));
});

api.post("/me/student-verification", upload.single("proof"), async (req, res) => {
  const b = req.body as Record<string, string | undefined>;
  res.status(202).json(
    await clients.submitVerification(authOf(req).clientId, {
      name: b.name ?? "",
      university: b.university ?? "",
      acceptTerms: b.acceptTerms === "true" || b.acceptTerms === "1",
      proofPath: req.file?.path,
    }),
  );
});

api.get("/me/bookings", async (req, res) => {
  const q = parse(z.object({ scope: z.enum(["upcoming", "history"]).default("upcoming"), q: z.string().optional() }), req.query);
  res.json({ items: await bookings.listBookings(authOf(req).clientId, q.scope, q.q), serverNow: ISO_NOW() });
});

api.get("/me/chats", async (req, res) => {
  res.json({ items: await session.listChats(authOf(req).clientId) });
});

// ---------------------------------------------------------------- bookings
api.post("/bookings", async (req, res) => {
  const b = parse(
    z.object({
      expertId: z.string(),
      slotId: z.string(),
      mode: z.enum(["CHAT", "VOICE", "VIDEO"]),
      anonymous: z.boolean().optional(),
      usePromo: z.boolean().optional(),
      description: z.string().max(500, "Deskripsi maksimal 500 karakter").optional(),
    }),
    req.body,
  );
  res.status(201).json(await createBooking(authOf(req).clientId, b));
});

api.get("/bookings/:id", async (req, res) => {
  res.json(await bookings.getBooking(authOf(req).clientId, String(req.params.id)));
});

api.post("/bookings/:id/cancel", async (req, res) => {
  const b = parse(z.object({ confirmPenalty: z.boolean().optional() }), req.body ?? {});
  res.json(await bookings.cancelBooking(authOf(req).clientId, String(req.params.id), b.confirmPenalty));
});

api.post("/bookings/:id/reschedule", async (req, res) => {
  const b = parse(z.object({ slotId: z.string() }), req.body);
  res.json(await bookings.rescheduleBooking(authOf(req).clientId, String(req.params.id), b.slotId));
});

api.get("/bookings/:id/payment-summary", async (req, res) => {
  res.json(await paymentSummary(authOf(req).clientId, String(req.params.id)));
});

api.post("/bookings/:id/invoice", async (req, res) => {
  const b = parse(z.object({ method: z.enum(["QRIS", "BANK_TRANSFER", "VIRTUAL_ACCOUNT", "EWALLET"]) }), req.body);
  res.status(201).json(await createInvoice(authOf(req).clientId, String(req.params.id), b.method));
});

api.post("/bookings/:id/join", async (req, res) => {
  res.json(await session.joinSession(authOf(req).clientId, String(req.params.id)));
});

api.post("/bookings/:id/review", async (req, res) => {
  const b = parse(
    z.object({ rating: z.number().int().min(1, "Pilih rating 1-5 ya").max(5, "Pilih rating 1-5 ya"), text: z.string().max(500, "Maksimal 500 karakter").optional() }),
    req.body,
  );
  res.status(201).json(await bookings.reviewBooking(authOf(req).clientId, String(req.params.id), b.rating, b.text));
});

// ---------------------------------------------------------------- payments
api.get("/payments/:ref", async (req, res) => {
  res.json(await paymentStatus(authOf(req).clientId, String(req.params.ref)));
});

api.get("/payments/:ref/receipt", async (req, res) => {
  res.json(await receipt(authOf(req).clientId, String(req.params.ref)));
});

// ---------------------------------------------------------------- sessions
api.post("/sessions/:id/consent", async (req, res) => {
  const b = parse(z.object({ e2eAccepted: z.boolean() }), req.body);
  res.json(await session.recordConsent(authOf(req).clientId, String(req.params.id), b.e2eAccepted));
});

api.get("/sessions/:id/state", async (req, res) => {
  res.json(await session.sessionState(authOf(req).clientId, String(req.params.id)));
});

api.get("/sessions/:id/messages", async (req, res) => {
  const q = parse(z.object({ after: z.coerce.number().int().min(0).optional() }), req.query);
  res.json(await session.listMessages(authOf(req).clientId, String(req.params.id), q.after));
});

api.post("/sessions/:id/messages", async (req, res) => {
  const b = parse(z.object({ body: z.string().trim().min(1, "Pesan tidak boleh kosong").max(1000, "Pesan maksimal 1000 karakter") }), req.body);
  res.status(201).json(await session.sendMessage(authOf(req).clientId, String(req.params.id), b.body));
});

api.post("/sessions/:id/end", async (req, res) => {
  res.json(await session.endSession(authOf(req).clientId, String(req.params.id)));
});

api.post("/sessions/:id/report-unresponsive", async (req, res) => {
  res.json(await session.reportUnresponsive(authOf(req).clientId, String(req.params.id)));
});

/** Expert-side view of the client (BR-15). Demo only: used by the dev menu to show the masking. */
api.get("/sessions/:id/client-profile", async (req, res) => {
  if (!config.demoMode) throw notFound();
  const id = String(req.params.id);
  const b = await prisma.booking.findUnique({ where: { id }, select: { clientId: true } });
  if (!b) throw notFound("Pemesanan");
  if (b.clientId !== authOf(req).clientId) throw forbidden("NOT_OWNER", "Sesi ini bukan milikmu.");
  res.json(await session.clientProfileForExpert(id));
});

// ---------------------------------------------------------------- support
api.post("/support/tickets", async (req, res) => {
  const b = parse(z.object({ type: z.enum(["HELPDESK", "PROBLEM"]), body: z.string().trim().min(5, "Ceritakan sedikit lebih lengkap ya").max(1000) }), req.body);
  const r = await prisma.report.create({ data: { clientId: authOf(req).clientId, type: b.type, body: b.body } });
  res.status(201).json({ id: r.id });
});
