import { create } from "zustand";

// State carried across the registration steps (Daftar -> OTP -> Nama -> Password).
type RegistrationState = {
  identifier: string;
  registrationToken: string | null;
  name: string;
  set: (patch: Partial<Omit<RegistrationState, "set" | "reset">>) => void;
  reset: () => void;
};

export const useRegistration = create<RegistrationState>((set) => ({
  identifier: "",
  registrationToken: null,
  name: "",
  set: (patch) => set(patch),
  reset: () => set({ identifier: "", registrationToken: null, name: "" }),
}));
