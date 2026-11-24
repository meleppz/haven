// SC-01 Akun: registration with simulated OTP, login, mocked Google sign-in (BR-02; FA-01..03).
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../db.js";
import { badRequest, conflict, invalid, unauthorized } from "../lib/errors.js";
import { signToken } from "../middleware/auth.js";

export type Identifier = { kind: "email" | "phone"; value: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valid email, or an Indonesian phone number (08... / +62...), 10-14 digits. Phones are stored as 08.... */
export function normalizeIdentifier(raw: string): Identifier | null {
  const v = raw.trim();
  if (v.includes("@")) return EMAIL_RE.test(v) ? { kind: "email", value: v.toLowerCase() } : null;
  const compact = v.replace(/[\s\-.()]/g, "");
  if (!/^(\+62|62|0)8\d+$/.test(compact)) return null;
  const local = compact.replace(/^(\+62|62)/, "0");
  return local.length >= 10 && local.length <= 14 ? { kind: "phone", value: local } : null;
}

const identifierWhere = (id: Identifier) => (id.kind === "email" ? { email: id.value } : { phone: id.value });

// Simulated OTP: no delivery, the code is always 1234 (handoff §10).
const otpStore = new Map<string, { code: string; expiresAt: number }>();

export async function startRegistration(raw: string) {
  const id = normalizeIdentifier(raw);
  if (!id) throw invalid("INVALID_IDENTIFIER", "Masukkan email atau nomor telepon yang valid ya.", { identifier: "Email/nomor belum valid" });
  if (await prisma.user.findFirst({ where: identifierWhere(id) })) {
    throw conflict("ACCOUNT_EXISTS", "Akun ini sudah terdaftar, silakan masuk ya.");
  }
  otpStore.set(id.value, { code: config.demoOtp, expiresAt: Date.now() + 10 * 60_000 });
  return { identifier: id.value, resendInSec: 60, devCode: config.demoMode ? config.demoOtp : undefined };
}

export async function verifyOtp(raw: string, code: string) {
  const id = normalizeIdentifier(raw);
  const entry = id ? otpStore.get(id.value) : undefined;
  if (!id || !entry || entry.expiresAt < Date.now() || entry.code !== code) {
    throw badRequest("INVALID_OTP", "Kodenya belum cocok, coba cek lagi ya.");
  }
  otpStore.delete(id.value);
  const registrationToken = jwt.sign({ purpose: "registration", identifier: id.value, kind: id.kind }, config.jwtSecret, { expiresIn: "20m" });
  return { registrationToken };
}

async function uniqueUsername(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) || "haven";
  for (let i = 0; i < 20; i++) {
    const candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    if (!(await prisma.client.findUnique({ where: { username: candidate } }))) return candidate;
  }
  return `${base}${Date.now()}`;
}

/** FA-01, FA-03: creates User + Client and signs the user in. */
export async function completeRegistration(registrationToken: string, name: string, password: string) {
  let p: jwt.JwtPayload;
  try {
    p = jwt.verify(registrationToken, config.jwtSecret) as jwt.JwtPayload;
  } catch {
    throw badRequest("INVALID_REGISTRATION_TOKEN", "Sesi pendaftaranmu sudah habis, ulangi dari awal ya.");
  }
  if (p.purpose !== "registration") throw badRequest("INVALID_REGISTRATION_TOKEN", "Sesi pendaftaranmu tidak valid.");
  const id: Identifier = { kind: p.kind, value: p.identifier };
  if (await prisma.user.findFirst({ where: identifierWhere(id) })) throw conflict("ACCOUNT_EXISTS", "Akun ini sudah terdaftar, silakan masuk ya.");

  const user = await prisma.user.create({
    data: {
      ...(id.kind === "email" ? { email: id.value } : { phone: id.value }),
      passwordHash: await bcrypt.hash(password, 10),
      client: { create: { name: name.trim(), username: await uniqueUsername(name) } },
    },
  });
  return { token: signToken(user.id), isNewUser: true };
}

/** FA-02, FA-03. */
export async function login(raw: string, password: string) {
  const id = normalizeIdentifier(raw);
  const user = id ? await prisma.user.findFirst({ where: identifierWhere(id) }) : null;
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized("Email/nomor atau password belum cocok.");
  }
  return { token: signToken(user.id), isNewUser: false };
}

// Mock Google account picker (handoff §6.1, §11).
export const mockGoogleAccounts = [
  { id: "google-putri-demo", name: "Putri Demo", email: "putri.demo@gmail.com" },
] as const;

export async function googleSignIn(mockAccountId: string) {
  const acc = mockGoogleAccounts.find((a) => a.id === mockAccountId);
  if (!acc) throw badRequest("UNKNOWN_GOOGLE_ACCOUNT", "Akun Google tidak ditemukan.");
  const existing = await prisma.user.findFirst({ where: { OR: [{ googleSub: acc.id }, { email: acc.email }] } });
  if (existing) return { token: signToken(existing.id), isNewUser: false };
  const user = await prisma.user.create({
    data: {
      email: acc.email,
      googleSub: acc.id,
      passwordHash: await bcrypt.hash(`google-${Math.random()}`, 10),
      client: { create: { name: acc.name, username: await uniqueUsername(acc.name) } },
    },
  });
  return { token: signToken(user.id), isNewUser: true };
}
