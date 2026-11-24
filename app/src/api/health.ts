import { API_URL } from "@/lib/config";

export async function fetchHealth(): Promise<{ ok: boolean; serverNow: string }> {
  const res = await fetch(`${API_URL}/api/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
