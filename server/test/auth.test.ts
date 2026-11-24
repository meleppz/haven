import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { normalizeIdentifier } from "../src/services/auth.js";
import { auth, createClient, http, resetAll } from "./helpers.js";

beforeEach(resetAll);

async function register(identifier = "putri@example.com", name = "Putri", password = "rahasia123") {
  const start = await http().post("/api/auth/register/start").send({ identifier });
  const verify = await http().post("/api/auth/register/verify-otp").send({ identifier, code: "1234" });
  const done = await http().post("/api/auth/register/complete").send({ registrationToken: verify.body.registrationToken, name, password });
  return { start, verify, done };
}

describe("identifier validation", () => {
  it("accepts emails and Indonesian phone numbers, normalizing phones to 08...", () => {
    expect(normalizeIdentifier("Putri@Example.com")).toEqual({ kind: "email", value: "putri@example.com" });
    expect(normalizeIdentifier("081234567890")).toEqual({ kind: "phone", value: "081234567890" });
    expect(normalizeIdentifier("+62 812-3456-7890")).toEqual({ kind: "phone", value: "081234567890" });
    expect(normalizeIdentifier("6281234567890")).toEqual({ kind: "phone", value: "081234567890" });
  });

  it("rejects malformed values", () => {
    for (const bad of ["", "abc", "putri@", "0712345678", "08123", "0812345678901234567"]) expect(normalizeIdentifier(bad)).toBeNull();
  });
});

describe("registration (BR-02)", () => {
  it("email -> OTP 1234 -> name -> password signs the user in", async () => {
    const { start, verify, done } = await register();

    expect(start.body.devCode).toBe("1234");
    expect(start.body.resendInSec).toBe(60);
    expect(verify.status).toBe(200);
    expect(done.status).toBe(201);
    expect(done.body.isNewUser).toBe(true);

    const me = await http().get("/api/me").set(auth(done.body.token));
    expect(me.body).toMatchObject({ name: "Putri", email: "putri@example.com", assessmentDone: false, studentStatus: "NONE" });
    expect(me.body.username).toMatch(/^putri\d{4}$/);
  });

  it("a wrong OTP gets a warm, non-blaming message", async () => {
    await http().post("/api/auth/register/start").send({ identifier: "a@b.co" });
    const res = await http().post("/api/auth/register/verify-otp").send({ identifier: "a@b.co", code: "0000" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_OTP");
    expect(res.body.error.message).toBe("Kodenya belum cocok, coba cek lagi ya.");
  });

  it("registration works with a phone number and rejects an existing account", async () => {
    const { done } = await register("+62 812-3456-7890", "Ana");
    expect(done.status).toBe(201);
    expect((await prisma.user.findFirstOrThrow()).phone).toBe("081234567890");

    const again = await http().post("/api/auth/register/start").send({ identifier: "081234567890" });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("ACCOUNT_EXISTS");
  });

  it("validates name and password length", async () => {
    await http().post("/api/auth/register/start").send({ identifier: "z@z.co" });
    const { body } = await http().post("/api/auth/register/verify-otp").send({ identifier: "z@z.co", code: "1234" });

    const res = await http().post("/api/auth/register/complete").send({ registrationToken: body.registrationToken, name: "A", password: "short" });

    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(["name", "password"]));
  });

  it("rejects a forged registration token", async () => {
    const res = await http().post("/api/auth/register/complete").send({ registrationToken: "nope", name: "Putri", password: "rahasia123" });
    expect(res.status).toBe(400);
  });

  it("an invalid identifier -> 422", async () => {
    const res = await http().post("/api/auth/register/start").send({ identifier: "bukan-email" });
    expect(res.status).toBe(422);
  });
});

describe("login (FA-02)", () => {
  it("signs in with email or phone and rejects wrong credentials without blaming", async () => {
    await register("login@example.com", "Rani", "rahasia123");

    const ok = await http().post("/api/auth/login").send({ identifier: "LOGIN@example.com", password: "rahasia123" });
    expect(ok.status).toBe(200);
    expect(ok.body.isNewUser).toBe(false);

    const bad = await http().post("/api/auth/login").send({ identifier: "login@example.com", password: "salahsalah" });
    expect(bad.status).toBe(401);
    expect(bad.body.error.message).toBe("Email/nomor atau password belum cocok.");
    expect((await http().post("/api/auth/login").send({ identifier: "tidakada@example.com", password: "x" })).status).toBe(401);
  });

  it("protects authenticated routes", async () => {
    expect((await http().get("/api/me")).status).toBe(401);
    expect((await http().get("/api/me").set(auth("garbage"))).status).toBe(401);
  });
});

describe("mock Google sign-in", () => {
  it("creates a fresh account the first time and reuses it afterwards", async () => {
    const accounts = await http().get("/api/auth/google/accounts");
    const id = accounts.body.accounts[0].id;

    const first = await http().post("/api/auth/google").send({ mockAccountId: id });
    const second = await http().post("/api/auth/google").send({ mockAccountId: id });

    expect(first.body.isNewUser).toBe(true);
    expect(second.body.isNewUser).toBe(false);
    expect(await prisma.user.count()).toBe(1);
    expect((await http().post("/api/auth/google").send({ mockAccountId: "tidak-ada" })).status).toBe(400);
  });
});

describe("assessment, profile and settings", () => {
  it("saves the assessment (retakeable; the latest wins)", async () => {
    const c = await createClient();
    const save = (body: object) => http().put("/api/me/assessment").set(auth(c.token)).send(body);

    expect((await save({ age: 12, occupation: "Mahasiswa", concerns: ["Panik"] })).status).toBe(422);
    expect((await save({ age: 20, occupation: "Mahasiswa", concerns: [] })).status).toBe(422);
    expect((await save({ age: 20, occupation: "Mahasiswa", concerns: ["Tidak dikenal"] })).status).toBe(422);

    const ok = await save({ age: 20, occupation: "Mahasiswa", concerns: ["Panik", "Lelah"], note: "Susah tidur" });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ assessmentDone: true, age: 20, concerns: ["Panik", "Lelah"], concernNote: "Susah tidur" });

    const again = await save({ age: 27, occupation: "Pekerja", concerns: ["Beban Kerja Tinggi"] });
    expect(again.body).toMatchObject({ age: 27, occupation: "Pekerja", concerns: ["Beban Kerja Tinggi"] });
  });

  it("updates settings and profile, and checks username uniqueness and the old password", async () => {
    const a = await createClient();
    const b = await createClient();

    const settings = await http().patch("/api/me/settings").set(auth(a.token)).send({ defaultAnonymous: true, autoStudentPromo: true });
    expect(settings.body).toEqual({ defaultAnonymous: true, autoStudentPromo: true });

    const taken = await http().patch("/api/me").set(auth(a.token)).send({ username: (await prisma.client.findUniqueOrThrow({ where: { id: b.clientId } })).username });
    expect(taken.status).toBe(409);
    const renamed = await http().patch("/api/me").set(auth(a.token)).send({ displayName: "Bayangan", name: "Nama Baru" });
    expect(renamed.body).toMatchObject({ displayName: "Bayangan", name: "Nama Baru" });

    expect((await http().post("/api/me/password").set(auth(a.token)).send({ currentPassword: "salah", newPassword: "passwordbaru1" })).status).toBe(401);
    expect((await http().post("/api/me/password").set(auth(a.token)).send({ currentPassword: "password123", newPassword: "passwordbaru1" })).status).toBe(200);
    expect((await http().post("/api/auth/login").send({ identifier: a.email, password: "passwordbaru1" })).status).toBe(200);
  });
});

describe("student verification (BR-11)", () => {
  const submit = (token: string, over: { terms?: string; mime?: string; filename?: string; skipFile?: boolean } = {}) => {
    let r = http().post("/api/me/student-verification").set(auth(token)).field("name", "Putri").field("university", "ITB").field("acceptTerms", over.terms ?? "true");
    if (!over.skipFile) r = r.attach("proof", Buffer.from("fake-image-bytes"), { filename: over.filename ?? "ktm.png", contentType: over.mime ?? "image/png" });
    return r;
  };

  it("goes PENDING, is approved (instantly via the dev control), and is done only once", async () => {
    const c = await createClient();

    const res = await submit(c.token);
    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({ status: "PENDING", university: "ITB" });

    const approved = await http().post("/api/dev/me/verify-student").set(auth(c.token));
    expect(approved.body.status).toBe("VERIFIED");
    expect((await http().get("/api/me/student-verification").set(auth(c.token))).body.verifiedAt).toBeTruthy();
    expect((await submit(c.token)).status).toBe(409);
  });

  it("requires a document, accepted terms and an allowed file type", async () => {
    const c = await createClient();
    const noFile = await submit(c.token, { skipFile: true });
    expect(noFile.status).toBe(422);
    expect(noFile.body.error.fields.proof).toBeTruthy();
    expect((await submit(c.token, { terms: "false" })).body.error.fields.acceptTerms).toBeTruthy();
    const exe = await submit(c.token, { mime: "application/x-msdownload", filename: "a.exe" });
    expect(exe.status).toBe(422);
    expect(exe.body.error.code).toBe("INVALID_FILE_TYPE");
    expect((await prisma.client.findUniqueOrThrow({ where: { id: c.clientId } })).studentStatus).toBe("NONE");
  });
});

describe("support", () => {
  it("stores helpdesk and problem tickets", async () => {
    const c = await createClient();
    const res = await http().post("/api/support/tickets").set(auth(c.token)).send({ type: "HELPDESK", body: "Aku butuh bantuan soal jadwal" });
    expect(res.status).toBe(201);
    expect(await prisma.report.count({ where: { type: "HELPDESK" } })).toBe(1);
    expect((await http().post("/api/support/tickets").set(auth(c.token)).send({ type: "HELPDESK", body: "x" })).status).toBe(422);
  });
});
