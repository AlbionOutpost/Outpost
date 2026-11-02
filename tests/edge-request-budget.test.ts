import { describe, it, expect, vi } from "vitest";
import { requestBudget, secureResponse } from "../cloudflare/web/request-budget";

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
  it("retains safe headers on cached JSON and invitation/denial paths without exposing cookies", () => {
    const cached = secureResponse(
      Response.json({ results: [] }, { headers: { "X-Outpost-Search": "hit" } }),
      req("/api/search?q=bag"),
    );
    expect(cached.headers.get("x-content-type-options")).toBe("nosniff");
    expect(cached.headers.get("strict-transport-security")).toBe("max-age=31536000");
    expect(cached.headers.get("x-outpost-search")).toBe("hit");
    expect(cached.headers.get("set-cookie")).toBeNull();
    expect(
      secureResponse(new Response(null, { status: 403 }), req("/invitations/token")).headers.get(
        "referrer-policy",
      ),
    ).toBe("no-referrer");
  });
});
