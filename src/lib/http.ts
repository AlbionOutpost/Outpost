import { HttpError } from "./api-errors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { rateLimit } from "./redis";
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
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "Body required");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Request too large");
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    buffer.set(c, offset);
    offset += c.length;
  }
  return JSON.parse(new TextDecoder().decode(buffer));
}
