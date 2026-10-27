import { PrismaClient } from "@prisma/client";
try {
  process.loadEnvFile(".env");
} catch {}
export function createTestDb() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    throw new Error("Browser database fixtures require a local disposable database");
  return new PrismaClient();
}
