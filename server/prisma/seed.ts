// Phase 0: placeholder. Full seed (handoff §11) lands in Phase 1.
import { prisma } from "../src/db.js";

async function main() {
  console.log("Seed: nothing to seed yet (Phase 1).");
}

main().finally(() => prisma.$disconnect());
