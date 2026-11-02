import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  address: "203.0.113.1",
  counts: new Map<string, number>(),
  calls: [] as string[],
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(state.address ? { "cf-connecting-ip": state.address } : {}),
}));
vi.mock("../src/lib/redis", () => ({
  redis: () => null,
  rateLimit: async (key: string, limit: number) => {
    state.calls.push(key);
    const n = (state.counts.get(key) || 0) + 1;
    state.counts.set(key, n);
    return n <= limit;
  },
}));
import { requestData } from "../src/lib/albion/data-client";
import { z } from "zod";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  state.address = "203.0.113.1";
  state.counts.clear();
  state.calls = [];
});
describe("actual upstream attempt reservation", () => {
  it("stops a single trusted caller before the shared regional quota and leaves cached data usable", async () => {
    vi.stubEnv("OUTPOST_RUNTIME", "cloudflare");
    const fetcher = vi.fn(async () => Response.json([]));
    vi.stubGlobal("fetch", fetcher);
    const path = (i: number) => `/api/v2/stats/prices/T4_AUDIT_CALLER_${i}.json`;
    for (let i = 0; i < 10; i++) await requestData("europe", path(i), z.array(z.unknown()));
    await expect(requestData("europe", path(10), z.array(z.unknown()))).rejects.toThrow(
      "Your source request budget",
    );
    expect(fetcher).toHaveBeenCalledTimes(10);
    expect(state.calls.filter((k) => k === "upstream:europe")).toHaveLength(10);
    await expect(requestData("europe", path(0), z.array(z.unknown()))).resolves.toEqual([]);
    state.address = "203.0.113.2";
    await expect(requestData("europe", path(10), z.array(z.unknown()))).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(11);
  });
  it("counts retries and refuses missing trusted caller metadata before outbound work", async () => {
    vi.stubEnv("OUTPOST_RUNTIME", "cloudflare");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(Response.json([]));
    vi.stubGlobal("fetch", fetcher);
    await requestData("asia", "/api/v2/stats/prices/T4_CALLER_RETRY.json", z.array(z.unknown()));
    expect(state.calls.filter((k) => k.startsWith("upstream-caller:asia:"))).toHaveLength(2);
    state.address = "";
    await expect(
      requestData("asia", "/api/v2/stats/prices/T4_NO_CALLER.json", z.array(z.unknown())),
    ).rejects.toThrow("Trusted source caller");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
