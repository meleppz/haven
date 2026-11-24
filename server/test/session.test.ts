import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { addMinutes } from "../src/lib/time.js";
import { createPaidBooking } from "../src/seed/index.js";
import { ahli } from "../src/sim/ahli.js";
import { clock } from "../src/sim/clock.js";
import { auth, createClient, createExpert, http, resetAll } from "./helpers.js";

// 10:00 WIB on a fixed day; the session runs 10:00-11:00.
const START = new Date("2026-12-01T03:00:00Z");

const join = (token: string, id: string) => http().post(`/api/bookings/${id}/join`).set(auth(token));

async function paidBooking(mode: "CHAT" | "VIDEO" = "VIDEO") {
  const expert = await createExpert();
  const client = await createClient();
  const booking = await createPaidBooking(prisma, { clientId: client.clientId, expertId: expert.id, startAt: START, mode });
  return { expert, client, booking };
}

beforeEach(async () => {
  await resetAll();
  clock.freeze(START);
});

describe("BR-13 session entry gate", () => {
  it("31 minutes before start -> 403 TOO_EARLY; exactly 30 minutes before -> allowed", async () => {
    const { client, booking } = await paidBooking();

    clock.freeze(addMinutes(START, -31));
    const early = await join(client.token, booking.id);
    expect(early.status).toBe(403);
    expect(early.body.error.code).toBe("TOO_EARLY");

    clock.freeze(addMinutes(START, -30));
    const ok = await join(client.token, booking.id);
    expect(ok.status).toBe(200);
    expect(ok.body.endsAt).toBe(addMinutes(START, 60).toISOString());
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("IN_SESSION");
  });

  it("after the slot end -> 403 ENDED (the last second is still allowed)", async () => {
    const { client, booking } = await paidBooking();

    clock.freeze(addMinutes(START, 60));
    expect((await join(client.token, booking.id)).status).toBe(200);

    const second = await paidBooking();
    clock.freeze(new Date(addMinutes(START, 60).getTime() + 1000));
    const late = await join(second.client.token, second.booking.id);
    expect(late.status).toBe(403);
    expect(late.body.error.code).toBe("ENDED");
  });

  it("only the owner may join (NOT_OWNER) and only paid bookings (NOT_PAID)", async () => {
    const { booking } = await paidBooking();
    const stranger = await createClient();
    clock.freeze(addMinutes(START, -5));

    const notOwner = await join(stranger.token, booking.id);
    expect(notOwner.status).toBe(403);
    expect(notOwner.body.error.code).toBe("NOT_OWNER");

    const expert = await createExpert();
    const client = await createClient();
    const slot = await prisma.slot.create({ data: { expertId: expert.id, startAt: START, endAt: addMinutes(START, 60), status: "LOCKED" } });
    const unpaid = await prisma.booking.create({
      data: { clientId: client.clientId, expertId: expert.id, slotId: slot.id, mode: "VIDEO", anonymous: false, usePromo: false, holdExpiresAt: addMinutes(START, 600) },
    });
    const notPaid = await join(client.token, unpaid.id);
    expect(notPaid.status).toBe(403);
    expect(notPaid.body.error.code).toBe("NOT_PAID");
  });

  it("joining twice keeps the original joinedAt", async () => {
    const { client, booking } = await paidBooking();
    clock.freeze(addMinutes(START, -10));
    await join(client.token, booking.id);
    clock.freeze(addMinutes(START, 5));
    await join(client.token, booking.id);

    const row = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(row.joinedAt!.toISOString()).toBe(addMinutes(START, -10).toISOString());
  });
});

describe("consent (BR-14)", () => {
  it("records the E2E acceptance once per booking", async () => {
    const { client, booking } = await paidBooking();
    clock.freeze(addMinutes(START, -5));
    const first = await http().post(`/api/sessions/${booking.id}/consent`).set(auth(client.token)).send({ e2eAccepted: true });
    const at = (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).e2eAcceptedAt!;
    clock.freeze(addMinutes(START, 1));
    await http().post(`/api/sessions/${booking.id}/consent`).set(auth(client.token)).send({ e2eAccepted: true });

    expect(first.status).toBe(200);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).e2eAcceptedAt!.getTime()).toBe(at.getTime());
    const refused = await http().post(`/api/sessions/${booking.id}/consent`).set(auth(client.token)).send({ e2eAccepted: false });
    expect(refused.status).toBe(409);
  });
});

describe("chat", () => {
  it("needs a joined session; messages persist and are polled by id", async () => {
    const { client, booking } = await paidBooking("CHAT");
    const send = (body: string) => http().post(`/api/sessions/${booking.id}/messages`).set(auth(client.token)).send({ body });

    clock.freeze(addMinutes(START, -5));
    expect((await send("halo")).status).toBe(403);

    await join(client.token, booking.id);
    const first = await send("Halo, kak");
    expect(first.status).toBe(201);
    await send("Aku lagi kepikiran tugas");

    const all = await http().get(`/api/sessions/${booking.id}/messages`).set(auth(client.token));
    expect(all.body.messages.map((m: { body: string }) => m.body)).toEqual(["Halo, kak", "Aku lagi kepikiran tugas"]);
    const after = await http().get(`/api/sessions/${booking.id}/messages?after=${first.body.id}`).set(auth(client.token));
    expect(after.body.messages).toHaveLength(1);
  });

  it("the Ahli simulator replies and marks the client's messages as read", async () => {
    const { client, booking } = await paidBooking("CHAT");
    clock.freeze(addMinutes(START, -5));
    await join(client.token, booking.id);
    await http().post(`/api/sessions/${booking.id}/messages`).set(auth(client.token)).send({ body: "Aku panik" });

    const reply = await ahli.replyNow(booking.id);

    expect(reply?.sender).toBe("EXPERT");
    const msgs = await http().get(`/api/sessions/${booking.id}/messages`).set(auth(client.token));
    expect(msgs.body.messages[0].read).toBe(true);
    expect(msgs.body.messages[1].sender).toBe("EXPERT");
  });

  it("the unresponsive flag silences the expert (BR-19 demo) and a report can be stored", async () => {
    const { client, booking } = await paidBooking("CHAT");
    clock.freeze(addMinutes(START, -5));
    await join(client.token, booking.id);
    await http().post(`/api/dev/sessions/${booking.id}/unresponsive`).send({ value: true });
    await http().post(`/api/sessions/${booking.id}/messages`).set(auth(client.token)).send({ body: "Halo?" });

    expect(await ahli.replyNow(booking.id)).toBeNull();
    const state = await http().get(`/api/sessions/${booking.id}/state`).set(auth(client.token));
    expect(state.body.unresponsiveAfterSec).toBe(60);
    expect(state.body.lastExpertMessageAt).toBeNull();

    const report = await http().post(`/api/sessions/${booking.id}/report-unresponsive`).set(auth(client.token));
    expect(report.status).toBe(200);
    expect(await prisma.report.count({ where: { type: "UNRESPONSIVE", bookingId: booking.id } })).toBe(1);
  });
});

describe("BR-16 closing a session", () => {
  it("the user ends it: COMPLETED, duration, notes saved, chat becomes read-only", async () => {
    const { client, booking } = await paidBooking("CHAT");
    clock.freeze(START);
    await join(client.token, booking.id);
    clock.freeze(addMinutes(START, 30));

    const res = await http().post(`/api/sessions/${booking.id}/end`).set(auth(client.token));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("COMPLETED");
    expect(res.body.durationMinutes).toBe(30);
    expect(res.body.notes.summary).toBeTruthy();
    expect(res.body.notes.advice).toBeTruthy();
    const late = await http().post(`/api/sessions/${booking.id}/messages`).set(auth(client.token)).send({ body: "masih ada?" });
    expect(late.status).toBe(403);
    expect(late.body.error.code).toBe("ENDED");
    expect((await http().post(`/api/sessions/${booking.id}/end`).set(auth(client.token))).status).toBe(200); // idempotent
    expect(await prisma.sessionNote.count({ where: { bookingId: booking.id } })).toBe(1);
  });

  it("the expert can end it (dev control)", async () => {
    const { client, booking } = await paidBooking();
    clock.freeze(START);
    await join(client.token, booking.id);
    clock.freeze(addMinutes(START, 12));

    const res = await http().post(`/api/dev/sessions/${booking.id}/expert-end`);

    expect(res.body.status).toBe("COMPLETED");
    expect(res.body.durationMinutes).toBe(12);
  });

  it("is closed automatically at slot end", async () => {
    const { client, booking } = await paidBooking();
    clock.freeze(START);
    await join(client.token, booking.id);

    clock.freeze(addMinutes(START, 90));
    const detail = await http().get(`/api/bookings/${booking.id}`).set(auth(client.token));

    expect(detail.body.status).toBe("COMPLETED");
    expect(detail.body.durationMinutes).toBe(60); // capped at the slot end
    expect(detail.body.notes).not.toBeNull();
  });

  it("ending a session that never started is refused", async () => {
    const { client, booking } = await paidBooking();
    const res = await http().post(`/api/sessions/${booking.id}/end`).set(auth(client.token));
    expect(res.status).toBe(409);
  });
});

describe("finished chats read the same everywhere (revision after Phase 6)", () => {
  it("closing always writes one wording, and the chat list previews the last real bubble", async () => {
    const { client, booking } = await paidBooking("CHAT");
    clock.freeze(addMinutes(START, 5));
    await join(client.token, booking.id);
    await http().post(`/api/sessions/${booking.id}/messages`).set(auth(client.token)).send({ body: "Terima kasih, Bu" });
    await http().post(`/api/sessions/${booking.id}/end`).set(auth(client.token));

    const sys = await prisma.message.findFirstOrThrow({ where: { bookingId: booking.id, sender: "SYSTEM" } });
    expect(sys.body).toBe("Sesi telah berakhir.");

    const chats = (await http().get("/api/me/chats").set(auth(client.token))).body.items;
    expect(chats).toHaveLength(1);
    expect(chats[0].status).toBe("SELESAI");
    expect(chats[0].lastMessage).toBe("Terima kasih, Bu");
  });

  it("a finished video session without chat bubbles is not listed as a chat", async () => {
    const { client, booking } = await paidBooking("VIDEO");
    clock.freeze(addMinutes(START, 5));
    await join(client.token, booking.id);
    await http().post(`/api/sessions/${booking.id}/end`).set(auth(client.token));
    const chats = (await http().get("/api/me/chats").set(auth(client.token))).body.items;
    expect(chats).toHaveLength(0);
  });
});
