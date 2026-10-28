import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { apiHandler, HttpError } from "@/lib/api-errors";
export const GET = apiHandler("health.read", async () => {
  const client = redis();
  const checks = await Promise.allSettled([
    db.$queryRaw`SELECT 1`,
    client ? client.ping() : Promise.reject(new Error("Redis not configured")),
  ]);
  if (checks.some((r) => r.status === "rejected"))
    throw new HttpError(503, "Dependencies unavailable");
  return NextResponse.json({
    status: "ok",
    dependencies:
      process.env.OUTPOST_RUNTIME === "cloudflare"
        ? { sqlite: "ok", cache: "ok" }
        : { postgres: "ok", redis: "ok" },
    authentication:
      process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
        ? "configured-unverified"
        : "not-configured",
  });
});
