import { ApiError } from "@/lib/api";

/** One place to turn an API failure into what the screen should say. Messages are already warm and non-blaming. */
export function errorMessage(e: unknown, fallback = "Ada yang tidak beres. Coba lagi sebentar ya.") {
  return e instanceof ApiError ? e.message : fallback;
}

export const isNetworkError = (e: unknown) => e instanceof ApiError && e.status === 0;
