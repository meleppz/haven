import { defineConfig } from "vitest/config";

// Tests use their own SQLite file and switch the timer-driven simulators off so results are deterministic.
export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false, // all test files share one SQLite file
    testTimeout: 20_000,
    env: {
      DATABASE_URL: "file:./test.db",
      DEMO_MODE: "1",
      AHLI_ENABLED: "0",
      STUDENT_APPROVE_MS: "60000",
      UPLOAD_DIR: "uploads-test",
      JWT_SECRET: "test-secret",
      UNRESPONSIVE_AFTER_SEC: "60",
    },
  },
});
