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

export function useMe() {
  const token = useAuth((s) => s.token);
  return useQuery({ queryKey: meKey, queryFn: fetchMe, enabled: !!token });
}
