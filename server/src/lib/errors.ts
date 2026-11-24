// API errors: { error: { code, message, fields? } } with HTTP 400/401/403/404/409/422 (handoff §9).
// Messages are Indonesian, warm and never blame the user (handoff §4.1).
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, message: string) => new AppError(400, code, message);
export const unauthorized = (message = "Silakan masuk dulu ya.") => new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (code: string, message: string) => new AppError(403, code, message);
export const notFound = (what = "Data") => new AppError(404, "NOT_FOUND", `${what} tidak ditemukan.`);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
export const invalid = (code: string, message: string, fields?: Record<string, string>) => new AppError(422, code, message, fields);
