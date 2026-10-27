import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
// Intentionally no fabricated users, prices, rankings or public community content.
async function main() {
  await db.$connect();
  console.log("Database connected. No synthetic content seeded.");
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
