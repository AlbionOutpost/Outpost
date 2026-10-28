import { PrismaClient } from "@prisma/client";
import { cloudflareTestDb } from "./cloudflare-db";
try {
  process.loadEnvFile(".env");
} catch {}
export function createTestDb() {
  if (process.env.E2E_CLOUDFLARE === "1") return cloudflareTestDb();
  const url = new URL(process.env.DATABASE_URL || "");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    throw new Error("Browser database fixtures require a local disposable database");
  return new PrismaClient();
}
