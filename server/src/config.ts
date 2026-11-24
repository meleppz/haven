import "dotenv/config";

const env = process.env;

// Business constants (handoff §7). Money is integer rupiah.
export const config = {
  adminFee: 20_000, // BR-10
  studentDiscountRate: 0.2, // BR-10
  holdMinutes: 15, // BR-09 unpaid hold, matches the QR countdown
  invoiceMinutes: 15, // BR-12
  joinOpensMinutesBefore: 30, // BR-13
  rescheduleCutoffHours: 48, // BR-18
  slotMinutes: 60, // BR-06
  unresponsiveAfterSec: Number(env.UNRESPONSIVE_AFTER_SEC ?? 60), // BR-19

  // Simulation (handoff §10).
  demoMode: env.DEMO_MODE === "1",
  demoOtp: "1234",
  studentApproveMs: Number(env.STUDENT_APPROVE_MS ?? 2000), // BR-11 simulated approval delay
  ahliEnabled: env.AHLI_ENABLED !== "0", // tests switch the timer-driven simulator off
  gatewayWebhookUrl: env.GATEWAY_WEBHOOK_URL ?? `http://127.0.0.1:${env.PORT ?? 3000}/api/webhooks/payment`,

  jwtSecret: env.JWT_SECRET ?? "haven-dev-secret",
  uploadDir: env.UPLOAD_DIR ?? "uploads",
  maxUploadBytes: 10 * 1024 * 1024, // BR-11
} as const;
