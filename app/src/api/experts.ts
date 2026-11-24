import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-store";
import { api } from "@/lib/api";
import { API_URL } from "@/lib/config";

export type Mode = "CHAT" | "VOICE" | "VIDEO";

export type ExpertSummary = {
  id: string;
  type: "PSIKOLOG" | "PSIKIATER";
  name: string;
  licenseNo: string;
  licenseLabel: "SIPP" | "STR";
  licenseAuthority: string;
  photoUrl: string | null;
  specialties: string[];
  modes: Mode[];
  tarif: number;
  yearsExperience: number;
  ratingAvg: number;
  ratingCount: number;
  available24x7: boolean;
  acceptsStudentPromo: boolean;
  verified: boolean;
  nearestDates: string[]; // "YYYY-MM-DD" (WIB)
  nextSlotAt: string | null;
};

export type ExpertDetail = ExpertSummary & {
  bio: string | null;
  stats: { counselingHours: number; yearsExperience: number; clientsHelped: number };
  specialtyInfo: Record<string, string>;
};

export type Slot = { id: string; startAt: string; endAt: string; label: string; date: string };
export type Review = { id: string; author: string; rating: number; text: string | null; createdAt: string };
export type Recommendation = ExpertSummary & { score: number; matchedSpecialties: string[] };

export type UpcomingBooking = {
  id: string;
  status: string;
  mode: Mode;
  anonymous: boolean;
  expert: { id: string; name: string };
  slot: { startAt: string; endAt: string; label: string; date: string };
  canJoin: boolean;
  inProgress: boolean;
  startsInMinutes: number;
};

/** Photos are served by the API server under /static (seeded photoUrl is a path). */
export const photoSource = (path: string | null) => (path ? { uri: path.startsWith("http") ? path : `${API_URL}${path}` } : undefined);

const qs = (params: Record<string, string>) => {
  const s = new URLSearchParams(params).toString();
  return s ? `?${s}` : "";
};

export const useExperts = (params: Record<string, string>) =>
  useQuery({
    queryKey: ["experts", params],
    queryFn: () => api<{ items: ExpertSummary[]; serverNow: string }>(`/experts${qs(params)}`),
    placeholderData: keepPreviousData,
  });

export function useRecommendations() {
  const token = useAuth((s) => s.token);
  return useQuery({ queryKey: ["recommendations"], queryFn: () => api<{ items: Recommendation[] }>("/recommendations"), enabled: !!token });
}

export const useExpert = (id: string) => useQuery({ queryKey: ["expert", id], queryFn: () => api<ExpertDetail>(`/experts/${id}`) });

export const useSlots = (id: string, date: string) =>
  useQuery({ queryKey: ["slots", id, date], queryFn: () => api<{ date: string; slots: Slot[] }>(`/experts/${id}/slots?date=${date}`), enabled: !!id });

export function useReviews(id: string) {
  return useInfiniteQuery({
    queryKey: ["reviews", id],
    queryFn: ({ pageParam }) => api<{ items: Review[]; nextCursor: string | null }>(`/experts/${id}/reviews${pageParam ? `?cursor=${pageParam}` : ""}`),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useUpcoming() {
  const token = useAuth((s) => s.token);
  return useQuery({ queryKey: ["bookings", "upcoming"], queryFn: () => api<{ items: UpcomingBooking[]; serverNow: string }>("/me/bookings?scope=upcoming"), enabled: !!token });
}
