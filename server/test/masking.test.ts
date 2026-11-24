import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { clientProfileForExpert } from "../src/flows/session-flow.js";
import { addMinutes } from "../src/lib/time.js";
import { createPaidBooking } from "../src/seed/index.js";
import { auth, createClient, createExpert, http, resetAll } from "./helpers.js";

const START = new Date(Date.now() + 86_400_000);

beforeEach(resetAll);

async function bookingFor(client: Awaited<ReturnType<typeof createClient>>, anonymous: boolean) {
  const expert = await createExpert();
  return createPaidBooking(prisma, { clientId: client.clientId, expertId: expert.id, startAt: START, mode: "VIDEO", anonymous, description: "Sulit tidur" });
}

describe("BR-15 anonymous masking", () => {
  it("hides the real name, email, phone and university; the display name falls back to 'Anonim'", async () => {
    const c = await createClient({ verified: true, name: "Choso Kamo", concerns: ["Panik"] });
    await prisma.user.update({ where: { id: c.userId }, data: { phone: "081234567890" } });
    const b = await bookingFor(c, true);

    const profile = await clientProfileForExpert(b.id);

    expect(profile.displayName).toBe("Anonim");
    expect(profile).toMatchObject({ anonymous: true, age: 21, occupation: "Mahasiswa", concerns: ["Panik"], description: "Sulit tidur" });
    const flat = JSON.stringify(profile);
    for (const secret of ["Choso", c.email, "081234567890", "ITB"]) expect(flat).not.toContain(secret);
    expect(profile).not.toHaveProperty("name");
    expect(profile).not.toHaveProperty("email");
    expect(profile).not.toHaveProperty("phone");
    expect(profile).not.toHaveProperty("university");
  });

  it("uses the client's chosen display name when anonymous", async () => {
    const c = await createClient({ name: "Choso Kamo" });
    await prisma.client.update({ where: { id: c.clientId }, data: { displayName: "Bayangan" } });
    const b = await bookingFor(c, true);

    expect((await clientProfileForExpert(b.id)).displayName).toBe("Bayangan");
  });

  it("shares the real identity when the booking is not anonymous", async () => {
    const c = await createClient({ name: "Choso Kamo", verified: true });
    const b = await bookingFor(c, false);

    const profile = await clientProfileForExpert(b.id);

    expect(profile).toMatchObject({ anonymous: false, displayName: "Choso Kamo", name: "Choso Kamo", email: c.email, university: "ITB" });
  });

  it("is only available for a scheduled and paid booking", async () => {
    const c = await createClient();
    const expert = await createExpert();
    const slot = await prisma.slot.create({ data: { expertId: expert.id, startAt: START, endAt: addMinutes(START, 60), status: "LOCKED" } });
    const unpaid = await prisma.booking.create({ data: { clientId: c.clientId, expertId: expert.id, slotId: slot.id, mode: "CHAT", anonymous: true, usePromo: false } });

    await expect(clientProfileForExpert(unpaid.id)).rejects.toMatchObject({ status: 403, code: "NOT_AVAILABLE" });
  });

  it("the demo endpoint returns the masked view to the owner only", async () => {
    const c = await createClient();
    const other = await createClient();
    const b = await bookingFor(c, true);

    const ok = await http().get(`/api/sessions/${b.id}/client-profile`).set(auth(c.token));
    expect(ok.status).toBe(200);
    expect(ok.body.displayName).toBe("Anonim");
    expect((await http().get(`/api/sessions/${b.id}/client-profile`).set(auth(other.token))).status).toBe(403);
  });
});
