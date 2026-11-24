import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Mode } from "./experts";

// Booking + payment API (handoff §9; server flows/registration-flow.ts and flows/payment-flow.ts).

export type PayMethod = "BANK_TRANSFER" | "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET";
export type Pricing = { tarif: number; adminFee: number; subtotal: number; discount: number; total: number };

export type Booking = {
  id: string;
  status: "AWAITING_PAYMENT" | "PAID" | "IN_SESSION" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  mode: Mode;
  anonymous: boolean;
  description: string | null;
  usePromo: boolean;
  holdExpiresAt: string | null;
  expert: { id: string; name: string; type: string; photoUrl: string | null; licenseNo: string };
  slot: { id: string; startAt: string; endAt: string; label: string; date: string };
  transaction: { receiptNo: string; total: number; method: PayMethod; paidAt: string } | null;
  penaltyApplied: boolean;
  createdAt: string;
  // Session fields (BR-13, BR-16): the server decides the join window; the app only displays it.
  canJoin: boolean;
  inProgress: boolean;
  startsInMinutes: number;
  e2eAccepted: boolean;
  joinedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  reviewed: boolean;
  review: { rating: number; text: string | null } | null;
  notes: { summary: string; advice: string } | null;
  serverNow: string;
};

export type BookingInput = { expertId: string; slotId: string; mode: Mode; anonymous: boolean; usePromo: boolean; description?: string };

export type Invoice = {
  invoiceRef: string;
  method: PayMethod;
  destination: string;
  amount: number;
  expiresAt: string;
  pricing: Pricing;
  serverNow: string;
  bookingId: string; // added on the client so the pending screen can find its way back
};

export type PaymentStatus = {
  invoiceRef: string;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELLED";
  bookingStatus: Booking["status"];
  expiresAt: string;
  serverNow: string;
};

export type Receipt = {
  receiptNo: string;
  paidAt: string;
  method: PayMethod;
  customerName: string;
  expert: { name: string };
  slot: Booking["slot"];
  mode: Mode;
  pricing: { tarif: number; adminFee: number; discount: number; total: number };
  issuer: string;
  demo: boolean;
};

/** S1 `pesanSlotKonsultasi`: 201 | 409 SLOT_CONFLICT | 422 with fields (BR-07, BR-08). */
export const createBooking = (b: BookingInput) => api<Booking>("/bookings", { body: b });

/**
 * BR-18. Free cancel of an unpaid hold, or of a paid booking >= 48 h ahead. Inside 48 h the server answers
 * 409 PENALTY_CONFIRM_REQUIRED until it is resent with confirmPenalty.
 */
export const cancelBooking = (id: string, confirmPenalty = false) => api<Booking>(`/bookings/${id}/cancel`, { body: confirmPenalty ? { confirmPenalty } : {} });

/** BR-18: >= 48 h only (403 RESCHEDULE_TOO_LATE otherwise); the new slot is locked atomically (409 SLOT_CONFLICT). */
export const rescheduleBooking = (id: string, slotId: string) => api<Booking>(`/bookings/${id}/reschedule`, { body: { slotId } });

export const bookingKey = (id: string) => ["booking", id] as const;
export const useBooking = (id: string) => useQuery({ queryKey: bookingKey(id), queryFn: () => api<Booking>(`/bookings/${id}`) });

/** "Riwayat": completed sessions, newest first, optionally filtered by expert name. */
export const useHistory = (q: string) =>
  useQuery({
    queryKey: ["bookings", "history", q],
    queryFn: () => api<{ items: Booking[]; serverNow: string }>(`/me/bookings?scope=history${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`),
    placeholderData: keepPreviousData,
  });

/** BR-17: rating 1-5 required, text optional (<= 500). */
export const reviewBooking = (id: string, rating: number, text?: string) => api<Booking>(`/bookings/${id}/review`, { body: { rating, text } });

export const usePaymentSummary = (bookingId: string) =>
  useQuery({
    queryKey: ["payment-summary", bookingId],
    queryFn: () => api<{ booking: Booking; pricing: Pricing; methods: PayMethod[] }>(`/bookings/${bookingId}/payment-summary`),
    retry: false,
  });

/** FA-19/20. Choosing a new method cancels the previous pending invoice on the server. */
export const createInvoice = async (bookingId: string, method: PayMethod): Promise<Invoice> => ({
  ...(await api<Omit<Invoice, "bookingId">>(`/bookings/${bookingId}/invoice`, { body: { method } })),
  bookingId,
});

export const invoiceKey = (ref: string) => ["invoice", ref] as const;

/** Poll every 3 s while the invoice is pending (handoff 6.8). */
export const usePaymentStatus = (ref: string, enabled: boolean) =>
  useQuery({
    queryKey: ["payment-status", ref],
    queryFn: () => api<PaymentStatus>(`/payments/${ref}`),
    refetchInterval: (q) => (q.state.data && q.state.data.status !== "PENDING" ? false : 3000),
    enabled,
  });

export const fetchReceipt = (ref: string) => api<Receipt>(`/payments/${ref}/receipt`);

/** Demo mode only: pay or fail as the customer would outside Haven (the gateway then calls the webhook). */
export const simulateGatewayPay = (ref: string, outcome: "success" | "fail") => api(`/dev/gateway/${ref}/pay`, { body: { outcome } });

export const METHOD_LABEL: Record<PayMethod, string> = {
  BANK_TRANSFER: "Transfer Bank",
  QRIS: "QRIS",
  VIRTUAL_ACCOUNT: "Virtual Account Billing",
  EWALLET: "E-Wallet",
};
