import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const counts = new Map<string, number>();
vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { id: "writer" } }) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/redis", () => ({
  rateLimit: async (key: string, limit: number) => {
    const count = (counts.get(key) || 0) + 1;
    counts.set(key, count);
    return count <= limit;
  },
}));
const { mutationUser } = await import("@/lib/http");
const post = () =>
  new NextRequest("http://localhost:3000/api/builds", {
    method: "POST",
    headers: { origin: "http://localhost:3000" },
  });

describe("signed-in write budget", () => {
  it("caps one account's writes per day, not only per minute", async () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    for (let i = 0; i < 600; i++) {
      if (i % 30 === 0) counts.delete("content:writer"); // a fresh minute window
      expect((await mutationUser(post())).userId).toBe("writer");
    }
    counts.delete("content:writer");
    const denied = await mutationUser(post());
    expect(denied.error?.status).toBe(429);
  });
});
