import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useBooking } from "@/api/bookings";
import { endSession, useSessionState } from "@/api/sessions";
import { useToast } from "@/components";
import { useServerNow } from "@/lib/useServerNow";

// Sessions this app instance closed itself; when the server reports COMPLETED for any other session, the expert (or the
// clock) ended it and the person is told so (handoff 6.11).
const endedHere = new Set<string>();

/**
 * Shared by the call and chat rooms: booking + polled session state, the server-clock timers, and the hand-off to
 * L53.1 when the session closes (BR-16).
 */
export function useLiveSession(bookingId: string) {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const booking = useBooking(bookingId);
  const state = useSessionState(bookingId);
  const now = useServerNow(state.data?.serverNow, state.dataUpdatedAt);

  const s = state.data;
  const elapsedSec = s?.joinedAt ? (now - Date.parse(s.joinedAt)) / 1000 : 0;
  const remainingSec = s ? (Date.parse(s.endsAt) - now) / 1000 : 0;
  const completed = s?.status === "COMPLETED";
  const expertName = booking.data?.expert.name ?? "Ahli";
  // The booking snapshot taken when the screen opened: a chat opened from history is already over and stays read-only.
  const wasLive = booking.data?.status === "IN_SESSION" || booking.data?.status === "PAID";

  useEffect(() => {
    if (!completed || !wasLive || endedHere.has(bookingId)) return;
    endedHere.add(bookingId);
    toast.show({ kind: "info", title: `Sesi telah diakhiri oleh ${expertName.split(",")[0]}`, durationMs: 4500 });
    void qc.invalidateQueries({ queryKey: ["bookings"] });
    void qc.invalidateQueries({ queryKey: ["chats"] });
    router.replace({ pathname: "/session/[bookingId]/done", params: { bookingId } });
  }, [completed, wasLive, bookingId, expertName, qc, router, toast]);

  /** The person ends the session (confirmed in a sheet first). */
  const end = async () => {
    endedHere.add(bookingId);
    await endSession(bookingId);
    void qc.invalidateQueries({ queryKey: ["bookings"] });
    void qc.invalidateQueries({ queryKey: ["chats"] });
    router.replace({ pathname: "/session/[bookingId]/done", params: { bookingId } });
  };

  return { booking, state, now, elapsedSec, remainingSec, completed, wasLive, expertName, end };
}
