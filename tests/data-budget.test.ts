import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({ budget: vi.fn() }));
vi.mock("../src/lib/redis", () => ({ redis: () => null, rateLimit: mocks.budget }));
beforeEach(() => {
  vi.resetModules();
  mocks.budget.mockReset();
  mocks.budget.mockResolvedValue(true);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("permits exactly50 concurrent uncached regional attempts and isolates another server", async () => {
  const counts = new Map<string, number>();
  mocks.budget.mockImplementation(async (key: string, limit: number) => {
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    return n <= limit;
  });
  const fetcher = vi.fn(async () => new Response("[]"));
  vi.stubGlobal("fetch", fetcher);
  const { requestData } = await import("../src/lib/albion/data-client");
  const result = await Promise.allSettled(
    Array.from({ length: 53 }, (_, n) =>
      requestData("europe", `/api/v2/stats/prices/T4_BUDGET_${n}.json`, z.array(z.unknown())),
    ),
  );
  expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(50);
  expect(fetcher).toHaveBeenCalledTimes(50);
  await requestData("asia", "/api/v2/stats/prices/T4_BUDGET_OTHER.json", z.array(z.unknown()));
  expect(fetcher).toHaveBeenCalledTimes(51);
  expect(mocks.budget).toHaveBeenCalledWith("upstream:europe", 50, 60);
  expect(mocks.budget).toHaveBeenCalledWith("upstream-window:europe:5m", 250, 300);
});
it("fails closed when the five-minute window refuses an otherwise permitted attempt", async () => {
  mocks.budget.mockImplementation(
    async (_key: string, _limit: number, seconds: number) => seconds !== 300,
  );
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const { requestData } = await import("../src/lib/albion/data-client");
  await expect(
    requestData("europe", "/api/v2/stats/gold.json?count=1", z.array(z.unknown())),
  ).rejects.toThrow("budget exhausted");
  expect(fetcher).not.toHaveBeenCalled();
});
it("reserves both windows again for an eligible short429retry, while cached reads spend nothing", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response("limited", { status: 429, headers: { "Retry-After": "1" } }),
    )
    .mockImplementation(async () => new Response("[]"));
  vi.stubGlobal("fetch", fetcher);
  const { requestData } = await import("../src/lib/albion/data-client");
  const path = "/api/v2/stats/prices/T4_RETRY_BUDGET.json";
  const pending = requestData("europe", path, z.array(z.unknown()));
  await vi.advanceTimersByTimeAsync(1100);
  await pending;
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(mocks.budget.mock.calls.filter(([key]) => key === "upstream:europe")).toHaveLength(2);
  expect(
    mocks.budget.mock.calls.filter(([key]) => key === "upstream-window:europe:5m"),
  ).toHaveLength(2);
  await requestData("europe", path, z.array(z.unknown()));
  expect(mocks.budget).toHaveBeenCalledTimes(4);
});
