import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

// Apply the committed migrations to the test database before any test runs, and remove test uploads afterwards.
export default function setup() {
  rmSync("uploads-test", { recursive: true, force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
  return () => rmSync("uploads-test", { recursive: true, force: true });
}
