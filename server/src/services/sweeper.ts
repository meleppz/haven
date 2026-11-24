// Time-driven housekeeping, run on every request (and callable directly in tests).
import { prisma } from "../db.js";
import { closeSession } from "../flows/session-flow.js";
import { clock } from "../sim/clock.js";

/**
 * BR-09: an unpaid booking whose hold ran out becomes EXPIRED and its slot goes back to AVAILABLE.
 * BR-16: a session that ran past its slot end is closed automatically.
 */
export async function sweepExpired(now = clock.now()) {
  const expired = await prisma.booking.findMany({
    where: { status: "AWAITING_PAYMENT", holdExpiresAt: { lte: now } },
    select: { id: true, slotId: true },
  });
  for (const b of expired) {
    await prisma.$transaction(async (tx) => {
      const r = await tx.booking.updateMany({ where: { id: b.id, status: "AWAITING_PAYMENT" }, data: { status: "EXPIRED", holdExpiresAt: null } });
      if (r.count === 1) {
        await tx.slot.update({ where: { id: b.slotId }, data: { status: "AVAILABLE" } });
        await tx.invoice.updateMany({ where: { bookingId: b.id, status: "PENDING" }, data: { status: "EXPIRED" } });
      }
    });
  }

  const overdue = await prisma.booking.findMany({ where: { status: "IN_SESSION", slot: { endAt: { lte: now } } }, select: { id: true } });
  for (const b of overdue) await closeSession(b.id, "timeout");

  return { expiredHolds: expired.length, closedSessions: overdue.length };
}
