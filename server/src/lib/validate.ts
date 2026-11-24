import type { ZodType } from "zod";
import { invalid } from "./errors.js";

/** Parse with zod and turn failures into a 422 with per-field messages. */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const fields: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  throw invalid("VALIDATION", "Ada isian yang perlu dicek lagi ya.", fields);
}
