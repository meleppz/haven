import { create } from "zustand";
import { queryClient } from "@/lib/query";
import { tokenStorage } from "@/lib/storage";

type AuthState = {
  token: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Route guard source of truth: signed in = has a token. Restored from secure storage on launch.
export const useAuth = create<AuthState>((set) => ({
  token: null,
  hydrated: false,
  hydrate: async () => set({ token: await tokenStorage.get(), hydrated: true }),
  signIn: async (token) => {
    await tokenStorage.set(token);
    set({ token });
  },
  signOut: async () => {
    await tokenStorage.clear();
    queryClient.clear();
    set({ token: null });
  },
}));
