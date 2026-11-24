// Client-side form checks. They mirror the server's rules (handoff §6.1, §6.2) so people get instant, warm feedback;
// the server stays the authority and returns the same messages in `fields`.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valid email, or an Indonesian phone number (08... / +62...), 10-14 digits. */
export function isValidIdentifier(raw: string): boolean {
  const v = raw.trim();
  if (v.includes("@")) return EMAIL_RE.test(v);
  const compact = v.replace(/[\s\-.()]/g, "");
  if (!/^(\+62|62|0)8\d+$/.test(compact)) return false;
  const local = compact.replace(/^(\+62|62)/, "0");
  return local.length >= 10 && local.length <= 14;
}

export const identifierError = (raw: string) => (isValidIdentifier(raw) ? undefined : "Masukkan email atau nomor telepon yang valid ya");

export function nameError(raw: string) {
  const n = raw.trim();
  if (n.length < 2) return "Nama minimal 2 karakter ya";
  if (n.length > 50) return "Nama maksimal 50 karakter";
  return undefined;
}

export function passwordErrors(password: string, confirm: string): { password?: string; confirm?: string } {
  const out: { password?: string; confirm?: string } = {};
  if (password.length < 8) out.password = "Password minimal 8 karakter ya";
  if (confirm !== password) out.confirm = "Konfirmasi password belum sama";
  return out;
}

export function ageError(raw: string) {
  if (!/^\d+$/.test(raw.trim())) return "Isi usiamu dengan angka ya";
  const n = Number(raw);
  if (n < 13) return "Usia minimal 13 tahun ya";
  if (n > 100) return "Usia maksimal 100 tahun";
  return undefined;
}
