import { HttpError } from "./api-errors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { rateLimit } from "./redis";
import { readBoundedText } from "./request-body";
import { dailySaveLimitMessage, storageLimits } from "./storage-limits";
export async function mutationUser(req: NextRequest) {
  const expected = new URL(process.env.NEXTAUTH_URL || req.url).origin;
  if (req.headers.get("origin") !== expected)
    return { error: NextResponse.json({ error: "Invalid request origin" }, { status: 403 }) };
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return { error: NextResponse.json({ error: "Sign in to save content" }, { status: 401 }) };
  // The daily cap bounds what one account can add to the shared private store (a comp save can
  // carry 1 MiB plus its version snapshot); the minute budget alone allowed gigabytes a day.
  if (
    !(await rateLimit(`content:${session.user.id}`, 30, 60)) ||
    !(await rateLimit(`content-day:${session.user.id}`, 600, 86400))
  )
    return {
      error: NextResponse.json({ error: "Too many changes. Please retry later." }, { status: 429 }),
    };
  return { userId: session.user.id };
}
export async function boundedJson(req: NextRequest, maxBytes = 65536) {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "JSON content type required");
  if (!req.body) throw new HttpError(400, "Body required");
  return JSON.parse(await readBoundedText(req, maxBytes));
}
/**
 * Spends `bytes` of the account's daily save budget (50 MiB, counted in KiB), or refuses with 429
 * before anything is written. Revision copies double what reaches the store, so one account adds
 * at most about 100 MiB a day.
 */
export async function spendSaveBudget(userId: string, bytes: number) {
  const kib = Math.max(1, Math.ceil(bytes / 1024));
  if (!(await rateLimit(`content-bytes:${userId}`, storageLimits.dailySaveKiB, 86400, kib)))
    throw new HttpError(429, dailySaveLimitMessage);
}
