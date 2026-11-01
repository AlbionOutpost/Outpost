import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderIcon } from "@/lib/albion/icon-cache";
export async function GET(req: NextRequest) {
  const p = z
    .object({
      id: z
        .string()
        .regex(/^(?:T[1-8]_[A-Z0-9_]+|(?!T\d)[A-Z][A-Z0-9_]{2,99})(?:@[1-4])?$/)
        .max(100),
      quality: z.coerce.number().int().min(1).max(5).default(1),
    })
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!p.success) return NextResponse.json({ error: "Invalid icon parameters" }, { status: 400 });
  const icon = await renderIcon(p.data.id, p.data.quality);
  return new Response(Buffer.from(icon.bytes), {
    headers: {
      "Content-Type": icon.type,
      "Cache-Control": `public, max-age=${icon.maxAge}`,
      "X-Icon-Status": icon.available ? "available" : "unavailable",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
