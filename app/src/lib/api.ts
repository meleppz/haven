import { useAuth } from "@/features/auth/auth-store";
import { API_URL } from "./config";

// Server errors arrive as { error: { code, message, fields? } } (handoff §9). Messages are already warm Indonesian.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; form?: FormData };

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const token = useAuth.getState().token;
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers["content-type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Koneksi ke server belum tersambung. Coba lagi ya.");
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    // An expired/invalid session: back to the login screen (the route guard reacts to the token going away).
    if (res.status === 401 && token) void useAuth.getState().signOut();
    throw new ApiError(res.status, json?.error?.code ?? "UNKNOWN", json?.error?.message ?? "Ada yang tidak beres. Coba lagi sebentar ya.", json?.error?.fields);
  }
  return json as T;
}
