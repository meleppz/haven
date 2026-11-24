import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-store";
import { api } from "@/lib/api";
import type { Booking } from "./bookings";
import type { Mode } from "./experts";

// Session API (handoff §9; server flows/session-flow.ts: SC-13, BR-13..16, BR-19).

/** Same query as Beranda's `useUpcoming`, typed with the full booking DTO. */
export function useUpcomingBookings() {
  const token = useAuth((s) => s.token);
  return useQuery({
    queryKey: ["bookings", "upcoming"],
    queryFn: () => api<{ items: Booking[]; serverNow: string }>("/me/bookings?scope=upcoming"),
    enabled: !!token,
    refetchInterval: 30_000, // the join window opens while the screen is open (BR-13)
  });
}

export type JoinResult = { room: string; mode: Mode; endsAt: string; e2eAccepted: boolean; expertConnectsInMs: number; serverNow: string };

/** BR-13 gate: 403 NOT_OWNER | NOT_PAID | TOO_EARLY | ENDED. */
export const joinSession = (bookingId: string) => api<JoinResult>(`/bookings/${bookingId}/join`, { body: {} });

/** BR-14 / FA-26: recorded once per booking. */
export const recordConsent = (bookingId: string) => api<{ e2eAccepted: boolean }>(`/sessions/${bookingId}/consent`, { body: { e2eAccepted: true } });

export type SessionState = {
  status: Booking["status"];
  mode: Mode;
  endsAt: string;
  joinedAt: string | null;
  expertConnected: boolean;
  lastClientMessageAt: string | null;
  lastExpertMessageAt: string | null;
  unresponsiveAfterSec: number;
  serverNow: string;
};

export const sessionStateKey = (id: string) => ["session-state", id] as const;

/** Polled every 2 s while a session screen is open: connection, end-of-session, inactivity (BR-16, BR-19). */
export const useSessionState = (bookingId: string, enabled = true) =>
  useQuery({
    queryKey: sessionStateKey(bookingId),
    queryFn: () => api<SessionState>(`/sessions/${bookingId}/state`),
    refetchInterval: (q) => (q.state.data?.status === "COMPLETED" ? false : 2000),
    enabled,
  });

export type Message = { id: number; sender: "CLIENT" | "EXPERT" | "SYSTEM"; body: string | null; imagePath: string | null; read: boolean; createdAt: string };

/**
 * Chat messages: fetch everything once, then poll `?after=<last id>` every 2 s and append (handoff 6.13).
 * Read receipts can change on older messages, so a full refresh happens every 10th poll.
 */
export function useMessages(bookingId: string, live: boolean) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    let lastId = 0;
    let tick = 0;
    const load = async (full: boolean) => {
      try {
        const res = await api<{ messages: Message[] }>(`/sessions/${bookingId}/messages${full ? "" : `?after=${lastId}`}`);
        if (cancelled) return;
        if (full) setMessages(res.messages);
        else if (res.messages.length) setMessages((cur) => [...cur.filter((m) => m.id > 0), ...res.messages.filter((m) => !cur.some((c) => c.id === m.id))]);
        if (res.messages.length) lastId = Math.max(lastId, ...res.messages.map((m) => m.id));
        setLoaded(true);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e);
      }
    };
    void load(true);
    if (!live) return () => void (cancelled = true);
    const t = setInterval(() => {
      tick += 1;
      void load(tick % 10 === 0);
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [bookingId, live]);

  /** Optimistic append; the real message replaces it on the next poll. */
  const append = (m: Message) => setMessages((cur) => (cur.some((c) => c.id === m.id) ? cur : [...cur, m]));
  return { messages, loaded, error, append };
}

export const sendMessage = (bookingId: string, body: string) => api<Message>(`/sessions/${bookingId}/messages`, { body: { body } });

/** BR-16: closes the session (COMPLETED, duration, expert notes). Idempotent. */
export const endSession = (bookingId: string) => api<Booking>(`/sessions/${bookingId}/end`, { body: {} });

export const reportUnresponsive = (bookingId: string) => api<{ ok: true }>(`/sessions/${bookingId}/report-unresponsive`, { body: {} });

export type ChatItem = {
  bookingId: string;
  expert: { id: string; name: string; photoUrl: string | null };
  status: "AKTIF" | "SELESAI";
  lastMessage: string | null;
  lastAt: string;
};

export function useChats() {
  const token = useAuth((s) => s.token);
  return useQuery({ queryKey: ["chats"], queryFn: () => api<{ items: ChatItem[] }>("/me/chats"), enabled: !!token, refetchInterval: 10_000 });
}

/** Demo mode: the simulated expert ends the session (shows the "diakhiri oleh" path). */
export const devExpertEnd = (bookingId: string) => api(`/dev/sessions/${bookingId}/expert-end`, { body: {} });
/** Demo mode: silence the expert so the BR-19 sheet can be shown. */
export const devSilenceExpert = (bookingId: string, value: boolean) => api(`/dev/sessions/${bookingId}/unresponsive`, { body: { value } });
