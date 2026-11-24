import { create } from "zustand";

// Answers are kept while moving back and forth between assessment steps (handoff §6.2: back keeps answers).
type AssessmentState = {
  age: string;
  occupation: string;
  concerns: string[];
  note: string;
  set: (patch: Partial<Omit<AssessmentState, "set" | "reset">>) => void;
  reset: () => void;
};

export const useAssessment = create<AssessmentState>((set) => ({
  age: "",
  occupation: "",
  concerns: [],
  note: "",
  set: (patch) => set(patch),
  reset: () => set({ age: "", occupation: "", concerns: [], note: "" }),
}));
