import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const controls = vi.hoisted(() => ({
  handler: vi.fn(async (request: Request) =>
    Response.json({ body: request.method === "POST" ? await request.text() : "get" }),
  ),
  limiter: vi.fn(async () => true),
}));
vi.mock("next-auth", () => ({ default: () => controls.handler }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));
vi.mock("../src/lib/redis", () => ({ rateLimit: controls.limiter }));
import { GET, POST } from "../src/app/api/auth/[...nextauth]/route";
const context = { params: Promise.resolve({ nextauth: ["signin", "discord"] }) };
afterEach(() => {
  vi.unstubAllEnvs();
  controls.handler.mockClear();
  controls.limiter.mockClear();
});
describe("authentication request parsing boundary", () => {
  it("does not let the dependency parser consume an oversized form", async () => {
    const response = await POST(
      new NextRequest("https://outpost.test/api/auth/signin/discord", {
        method: "POST",
        body: "x".repeat(65537),
      }),
      context,
    );
    expect(response.status).toBe(413);
    expect(controls.handler).not.toHaveBeenCalled();
  });
  it("preserves ordinary raw form input and uses trusted per-client limits only on Cloudflare", async () => {
    vi.stubEnv("OUTPOST_RUNTIME", "cloudflare");
    const body = "csrfToken=fixture&callbackUrl=%2Fdashboard&json=true";
    const response = await POST(
      new NextRequest("https://outpost.test/api/auth/signout", {
        method: "POST",
        headers: {
          "cf-connecting-ip": "203.0.113.1",
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      }),
      context,
    );
    expect(await response.json()).toEqual({ body });
    expect(controls.limiter).toHaveBeenCalledWith("oauth:203.0.113.1", 40, 60);
    vi.stubEnv("OUTPOST_RUNTIME", "node");
    controls.limiter.mockClear();
    await GET(
      new NextRequest("https://outpost.test/api/auth/providers", {
        headers: { "cf-connecting-ip": "forged" },
      }),
      context,
    );
    expect(controls.limiter).toHaveBeenCalledExactlyOnceWith("oauth-global", 2400, 60);
  });
});
