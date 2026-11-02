import { HttpError } from "./api-errors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { rateLimit } from "./redis";
import { readBoundedText } from "./request-body";
export async function mutationUser(req: NextRequest) {
  const expected = new URL(process.env.NEXTAUTH_URL || req.url).origin;
  if (req.headers.get("origin") !== expected)
    return { error: NextResponse.json({ error: "Invalid request origin" }, { status: 403 }) };
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return { error: NextResponse.json({ error: "Sign in to save content" }, { status: 401 }) };
  if (!(await rateLimit(`content:${session.user.id}`, 30, 60)))
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
