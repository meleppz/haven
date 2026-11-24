// SQLite has no arrays: lists are stored as JSON strings and parsed at the boundary.
export function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export const toJsonList = (list: string[]) => JSON.stringify(list);
