// `prisma db seed` / `npm run db:reset`: wipes and reseeds the dev database (handoff §11).
import { prisma } from "../src/db.js";
import { resetDatabase, seedDatabase } from "../src/seed/index.js";

async function main() {
  await resetDatabase();
  const r = await seedDatabase();
  console.log("Seeded. Demo login: choso@haven.id / haven123 (demo client id:", r.demoClientId, ")");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
