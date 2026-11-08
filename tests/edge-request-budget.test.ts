import { describe, it, expect, vi } from "vitest";
import { requestBudget, secureResponse } from "../cloudflare/web/request-budget";
import { addressBucket } from "../src/lib/client-address";

const req = (path = "/", address = "203.0.113.1", extra: Record<string, string> = {}) =>
  new Request(`https://albionoutpost.com${path}`, {
    headers: { "cf-connecting-ip": address, ...extra },
  });
function budgets() {
  const counts = new Map<string, number>();
  return {
    rateLimit: vi.fn(async (key: string, limit: number) => {
      const count = (counts.get(key) || 0) + 1;
      counts.set(key, count);
      return count <= limit;
    }),
  };
}
describe("trusted edge request budgets", () => {
  it("cannot renew rendering capacity by dropping or tampering with routing cookies", async () => {
    const binding = budgets();
    for (let i = 0; i < 240; i++)
      expect(
        await requestBudget(
          req("/", undefined, i % 2 ? { Cookie: "outpost-route=tampered" } : {}),
          binding,
        ),
      ).toBeNull();
    expect((await requestBudget(req(), binding))?.status).toBe(429);
    expect(await requestBudget(req("/", "203.0.113.2"), binding)).toBeNull();
  });
  it("counts an IPv6 caller per /64 so rotating addresses does not renew the budget", async () => {
    const binding = budgets();
    for (let i = 0; i < 240; i++)
      expect(
        await requestBudget(req("/", `2001:db8:a:b:${i.toString(16)}::${i + 1}`), binding),
      ).toBeNull();
    expect((await requestBudget(req("/", "2001:0db8:000a:000b::ffff"), binding))?.status).toBe(429);
    expect(await requestBudget(req("/", "2001:db8:a:c::1"), binding)).toBeNull();
    expect(addressBucket("::ffff:203.0.113.7")).toBe("::ffff:203.0.113.7");
    expect(addressBucket("203.0.113.7")).toBe("203.0.113.7");
    expect(addressBucket("2001:db8::")).toBe("2001:db8:0:0::/64");
  });
  it("reserves regional market capacity from a single caller across every price endpoint", async () => {
    const binding = budgets();
    const paths = [
      "/api/market",
      "/api/history",
      "/api/market/batch",
      "/api/transport/prices",
      "/api/builds/a/cost",
    ];
    for (let i = 0; i < 20; i++)
      expect(
        await requestBudget(req(`${paths[i % paths.length]}?region=europe`), binding),
      ).toBeNull();
    expect(
      (
        await requestBudget(
          req("/api/economy/prices?region=europe", undefined, { "x-forwarded-for": "203.0.113.9" }),
          binding,
        )
      )?.status,
    ).toBe(429);
    expect(await requestBudget(req("/api/market?region=asia"), binding)).toBeNull();
    expect(
      await requestBudget(req("/api/market?region=europe", "203.0.113.2"), binding),
    ).toBeNull();
  });
  it("limits uncached searches per caller, whatever the query or cookie", async () => {
    const binding = budgets();
    for (let i = 0; i < 30; i++)
      expect(
        await requestBudget(
          req(`/api/search?q=probe${i}`, undefined, { Cookie: "next-auth.session-token=x" }),
          binding,
        ),
      ).toBeNull();
    const denied = await requestBudget(req("/api/search/?q=another"), binding);
    expect(denied?.status).toBe(429);
    expect(denied?.headers.get("Retry-After")).toBe("60");
    expect(await requestBudget(req("/api/search?q=another", "203.0.113.2"), binding)).toBeNull();
    // Other pages keep their own, larger budget.
    expect(await requestBudget(req("/builds"), binding)).toBeNull();
  });
  it("fails closed without trusted identity or a working limiter", async () => {
    expect(
      (
        await requestBudget(
          new Request("https://albionoutpost.com", {
            headers: { "x-forwarded-for": "203.0.113.2" },
          }),
          budgets(),
        )
      )?.status,
    ).toBe(503);
    expect(
      (
        await requestBudget(req(), {
          rateLimit: async () => {
            throw Error("offline");
          },
        })
      )?.status,
    ).toBe(503);
  });
  it("rejects duplicate server parameters and budgets encoded price paths consistently", async () => {
    const binding = budgets();
    for (const first of ["asia", "americas", "invalid"])
      expect(
        (await requestBudget(req(`/api/market?region=${first}&region=europe`), binding))?.status,
      ).toBe(400);
    for (let i = 0; i < 20; i++)
      expect(await requestBudget(req("/api/%6darket?region=europe"), binding)).toBeNull();
    expect((await requestBudget(req("/api/market?region=europe"), binding))?.status).toBe(429);
  });
  it("returns JSON and retry metadata for API denials without changing the20-request limit", async () => {
    const binding = budgets();
    for (let i = 0; i < 20; i++)
      expect(await requestBudget(req("/api/economy/prices?region=europe"), binding)).toBeNull();
    const response = (await requestBudget(req("/api/economy/prices?region=europe"), binding))!;
    expect(response.status).toBe(429);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("retry-after")).toBe("60");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: "Too many market requests. Please wait a minute, then refresh.",
    });
  });
  it("keeps limiter failure closed with JSON for APIs and readable text for page requests", async () => {
    const binding = {
      rateLimit: vi.fn(async () => {
        throw Error("private failure detail");
      }),
    };
    const api = (await requestBudget(req("/api/market"), binding))!;
    expect(api.status).toBe(503);
    expect(await api.json()).toEqual({
      error: "Requests are temporarily unavailable. Please retry shortly.",
    });
    const page = (await requestBudget(req("/tools/market"), binding))!;
    expect(page.status).toBe(503);
    expect(page.headers.get("content-type")).toContain("text/plain");
    expect(page.headers.get("retry-after")).toBe("60");
    expect(await page.text()).toBe("Requests are temporarily unavailable. Please retry shortly.");
  });
  it("retains safe headers on cached JSON and invitation/denial paths without exposing cookies", () => {
    const cached = secureResponse(
      Response.json({ results: [] }, { headers: { "X-Outpost-Search": "hit" } }),
      req("/api/search?q=bag"),
    );
    expect(cached.headers.get("x-content-type-options")).toBe("nosniff");
    expect(cached.headers.get("strict-transport-security")).toBe("max-age=31536000");
    expect(cached.headers.get("x-outpost-search")).toBe("hit");
    expect(cached.headers.get("set-cookie")).toBeNull();
    expect(cached.headers.get("content-security-policy")).toBe(
      "default-src 'none'; frame-ancestors 'none'",
    );
    // NextAuth's HTML endpoints and pages keep the policy the app proxy sets.
    expect(
      secureResponse(new Response("ok"), req("/api/auth/error")).headers.get(
        "content-security-policy",
      ),
    ).toBeNull();
    expect(
      secureResponse(new Response("ok"), req("/builds")).headers.get("content-security-policy"),
    ).toBeNull();
    expect(
      secureResponse(new Response(null, { status: 403 }), req("/invitations/token")).headers.get(
        "referrer-policy",
      ),
    ).toBe("no-referrer");
  });
});
