import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-store";
import { api } from "@/lib/api";

export type Me = {
  id: string;
  name: string;
  username: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  age: number | null;
  occupation: string | null;
  concerns: string[];
  concernNote: string | null;
  assessmentDone: boolean;
  studentStatus: "NONE" | "PENDING" | "VERIFIED";
  university: string | null;
  studentVerifiedAt: string | null;
  settings: { defaultAnonymous: boolean; autoStudentPromo: boolean };
  joinedAt: string;
};

export type AssessmentInput = { age: number; occupation: string; concerns: string[]; note?: string };

export const fetchMe = () => api<Me>("/me");
export const saveAssessment = (a: AssessmentInput) => api<Me>("/me/assessment", { method: "PUT", body: a });

export const meKey = ["me"] as const;

// ---- Student verification (L31, BR-11, FA-17) ----
export type Verification = { status: Me["studentStatus"]; university: string | null; verifiedAt: string | null };
export const verificationKey = ["student-verification"] as const;

/** Polls while the simulated review is PENDING (auto-approved after ~2 s on the server). */
export function useVerification() {
  const token = useAuth((s) => s.token);
  return useQuery({
    queryKey: verificationKey,
    queryFn: () => api<Verification>("/me/student-verification"),
    enabled: !!token,
    refetchInterval: (q) => (q.state.data?.status === "PENDING" ? 1500 : false),
  });
}

export type ProofFile = { uri: string; name: string; mimeType: string; file?: Blob };

/** Multipart: name, university, acceptTerms, proof (jpg/png/pdf <= 10 MB). Answers 202 PENDING. */
export function submitVerification(input: { name: string; university: string; acceptTerms: boolean; proof: ProofFile | null }) {
  const form = new FormData();
  form.append("name", input.name);
  form.append("university", input.university);
  form.append("acceptTerms", input.acceptTerms ? "true" : "false");
  if (input.proof) {
    // Web hands us a real File; native FormData takes the { uri, name, type } shape.
    if (input.proof.file) form.append("proof", input.proof.file, input.proof.name);
    else form.append("proof", { uri: input.proof.uri, name: input.proof.name, type: input.proof.mimeType } as unknown as Blob);
  }
  return api<Verification>("/me/student-verification", { form });
}

export function useMe() {
  const token = useAuth((s) => s.token);
  return useQuery({ queryKey: meKey, queryFn: fetchMe, enabled: !!token });
}

// ---- Profil / Pengaturan (L84, L71; handoff 6.16-6.17) ----
export type Stats = { consultationCount: number; distinctExperts: number; daysJoined: number };

export function useStats() {
  const token = useAuth((s) => s.token);
  return useQuery({ queryKey: ["me", "stats"], queryFn: () => api<Stats>("/me/stats"), enabled: !!token });
}

export const updateProfile = (p: { name?: string; username?: string; displayName?: string | null }) => api<Me>("/me", { method: "PATCH", body: p });

/** 422 WRONG_PASSWORD with fields.currentPassword when the old password does not match. */
export const changePassword = (currentPassword: string, newPassword: string) => api<{ ok: true }>("/me/password", { body: { currentPassword, newPassword } });

/** BR-21 / BR-14 defaults used by Pemesanan. */
export const updateSettings = (s: Partial<Me["settings"]>) => api<Me["settings"]>("/me/settings", { method: "PATCH", body: s });

/** Permanent (Figma modal "Hapus akun Haven?"). */
export const deleteAccount = () => api<{ ok: true }>("/me", { method: "DELETE" });

export const submitTicket = (type: "HELPDESK" | "PROBLEM", body: string) => api<{ id: string }>("/support/tickets", { body: { type, body } });
