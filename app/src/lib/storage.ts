import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// The session token lives in the OS keystore (expo-secure-store); on web it falls back to localStorage.
const KEY = "haven.token";
const web = () => (globalThis as { localStorage?: Storage }).localStorage;

export const tokenStorage = {
  async get(): Promise<string | null> {
    try {
      return Platform.OS === "web" ? (web()?.getItem(KEY) ?? null) : await SecureStore.getItemAsync(KEY);
    } catch {
      return null;
    }
  },
  async set(token: string) {
    if (Platform.OS === "web") web()?.setItem(KEY, token);
    else await SecureStore.setItemAsync(KEY, token);
  },
  async clear() {
    if (Platform.OS === "web") web()?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  },
};
