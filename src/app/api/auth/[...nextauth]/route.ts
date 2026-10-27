import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { NextResponse } from "next/server";
const handler = NextAuth(authOptions);
async function limited(...args: Parameters<typeof handler>) {
  if (!(await rateLimit("oauth-global", 240, 60)))
    return NextResponse.json(
      { error: "Authentication request budget exceeded" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  return handler(...args);
}
export { limited as GET, limited as POST };
