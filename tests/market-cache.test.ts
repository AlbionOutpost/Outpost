import { afterEach, beforeEach, expect, it, vi } from "vitest";
const shared = vi.hoisted(() => ({
  enabled: false,
  rows: new Map<string, string>(),
  reads: [] as string[],
  writes: [] as string[],
  quotas: 0,
  cooldownChecks: 0,
}));
vi.mock("../src/lib/redis", () => ({
  redis: () =>
    shared.enabled
      ? {
          get: async (key: string) => {
            shared.reads.push(key);
            return shared.rows.get(key) ?? null;
          },
          set: async (key: string, value: string) => {
            shared.writes.push(key);
            shared.rows.set(key, value);
          },
          exists: async () => {
            shared.cooldownChecks++;
            return 0;
          },
        }
      : null,
  rateLimit: async () => {
    shared.quotas++;
    return true;
  },
}));
beforeEach(() => {
  vi.resetModules();
  shared.enabled = false;
  shared.rows.clear();
  shared.reads.length = 0;
  shared.writes.length = 0;
  shared.quotas = 0;
  shared.cooldownChecks = 0;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function source(url: string) {
  const parsed = new URL(url),
    ids = parsed.pathname.split("/").at(-1)!.replace(".json", "").split(","),
    qualities = parsed.searchParams.get("qualities")!.split(",").map(Number);
  return new Response(
    JSON.stringify(
      ids.flatMap((item_id) =>
        qualities.map((quality) => ({
          item_id,
          quality,
          city: "Lymhurst",
          sell_price_min: quality * 100,
          buy_price_max: quality * 90,
          sell_price_min_date: "2026-10-28T12:00:00Z",
          buy_price_max_date: "2026-10-28T12:00:00Z",
        })),
      ),
    ),
  );
}
it("reuses exact item slices across overlapping build and city batches", async () => {
  const fetcher = vi.fn(async (url: string) => source(url));
  vi.stubGlobal("fetch", fetcher);
  const { getPrices } = await import("../src/lib/albion/market-client");
  await getPrices("europe", ["T4_BAG", "T4_CAPE"], 1);
  const next = await getPrices("europe", ["T4_CAPE", "T4_MAIN_AXE"], 1);
  await getPrices("europe", ["T4_MAIN_AXE"], 1);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][0]).toContain("prices/T4_MAIN_AXE.json?qualities=1");
  expect(next.map((row) => row.item_id)).toEqual(["T4_CAPE", "T4_MAIN_AXE"]);
  expect(next.every((row) => row.quality === 1)).toBe(true);
});
it("shares five-quality discovery with exact-quality queries without changing identity", async () => {
  const fetcher = vi.fn(async (url: string) => source(url));
  vi.stubGlobal("fetch", fetcher);
  const { getPrices } = await import("../src/lib/albion/market-client");
  const all = await getPrices("europe", ["T8_MAIN_AXE"], [5, 3, 2, 1, 4]);
  expect(all.map((row) => row.quality)).toEqual([1, 2, 3, 4, 5]);
  expect(await getPrices("europe", ["T8_MAIN_AXE"], 3)).toEqual([all[2]]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await getPrices("asia", ["T8_MAIN_AXE"], 3);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][0]).toContain("east.albion-online-data.com");
});
it("keeps a cached exact slice when a broader union response omits that pair", async () => {
  const fetcher = vi.fn(async (url: string) => {
    const response = source(url);
    if (!url.includes("T4_CAPE")) return response;
    const rows = await response.json();
    return new Response(
      JSON.stringify(
        rows.filter(
          (row: { item_id: string; quality: number }) =>
            row.item_id !== "T4_BAG" || row.quality !== 1,
        ),
      ),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  const { getPrices } = await import("../src/lib/albion/market-client");
  const first = await getPrices("europe", ["T4_BAG"], 1);
  const combined = await getPrices("europe", ["T4_BAG", "T4_CAPE"], [1, 2]);
  expect(combined).toHaveLength(4);
  expect(combined.find((row) => row.item_id === "T4_BAG" && row.quality === 1)).toEqual(first[0]);
  expect(await getPrices("europe", ["T4_BAG"], 1)).toEqual(first);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("chunks long valid item IDs inside the actual source URL bound", async () => {
  const fetcher = vi.fn(async (url: string) => source(url));
  vi.stubGlobal("fetch", fetcher);
  const { getPrices } = await import("../src/lib/albion/market-client");
  const ids = Array.from({ length: 50 }, (_, n) => `T4_${n}_`.padEnd(100, "A"));
  const rows = await getPrices("europe", ids, [1, 5]);
  expect(rows).toHaveLength(100);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(
    fetcher.mock.calls.every(
      ([url]) => new URL(url).pathname.length + new URL(url).search.length <= 3900,
    ),
  ).toBe(true);
  expect(new Set(rows.map((row) => row.item_id)).size).toBe(50);
});
it("expires public item slices rather than hiding newly uploaded observations indefinitely", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn(async (url: string) => source(url));
  vi.stubGlobal("fetch", fetcher);
  const { getPrices } = await import("../src/lib/albion/market-client");
  await getPrices("europe", ["T4_BAG"], 1);
  await vi.advanceTimersByTimeAsync(61000);
  await getPrices("europe", ["T4_BAG"], 1);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("bounds shared cache fan-out on the largest supported batch", async () => {
  shared.enabled = true;
  const fetcher = vi.fn(async (url: string) => source(url));
  vi.stubGlobal("fetch", fetcher);
  const { getPrices } = await import("../src/lib/albion/market-client");
  const ids = Array.from({ length: 50 }, (_, n) => `T4_${n}_`.padEnd(100, "A"));
  const rows = await getPrices("europe", ids, [1, 2, 3, 4, 5]);
  expect(rows).toHaveLength(250);
  expect(shared.reads.filter((key) => key.includes(":price-item:")).length).toBe(12);
  expect(shared.writes.filter((key) => key.includes(":price-item:")).length).toBe(12);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect([...shared.reads, ...shared.writes].every((key) => key.startsWith("atlas:data:"))).toBe(
    true,
  );
  // Deliberately overcounts internal RPCs against the50 external/cache ceiling.
  const operations =
    shared.reads.length +
    shared.writes.length +
    shared.quotas +
    shared.cooldownChecks +
    fetcher.mock.calls.length;
  expect(operations).toBe(36);
  expect(operations + 1).toBeLessThan(50); // One public endpoint budget reservation.
});
it("rejects a mismatched shared item slice and obtains exact observations", async () => {
  shared.enabled = true;
  const wrong = await source("https://example.test/prices/T4_CAPE.json?qualities=1").json();
  shared.rows.set("atlas:data:price-item:v1:europe:1:T4_BAG", JSON.stringify(wrong));
  const fetcher = vi.fn(async (url: string) => source(url));
  vi.stubGlobal("fetch", fetcher);
  const { getPrices } = await import("../src/lib/albion/market-client");
  const rows = await getPrices("europe", ["T4_BAG"], 1);
  expect(rows).toHaveLength(1);
  expect(rows[0].item_id).toBe("T4_BAG");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("keeps largest-batch cache and retry operations inside the Free request allowance", async () => {
  shared.enabled = true;
  vi.useFakeTimers();
  const attempts = new Map<string, number>();
  const fetcher = vi.fn(async (url: string) => {
    const count = (attempts.get(url) ?? 0) + 1;
    attempts.set(url, count);
    return count === 1
      ? new Response("limited", { status: 429, headers: { "Retry-After": "1" } })
      : source(url);
  });
  vi.stubGlobal("fetch", fetcher);
  const { getPrices } = await import("../src/lib/albion/market-client");
  const ids = Array.from({ length: 50 }, (_, n) => `T4_${n}_`.padEnd(100, "A"));
  const pending = getPrices("europe", ids, [1, 2, 3, 4, 5]);
  await vi.advanceTimersByTimeAsync(2500);
  expect(await pending).toHaveLength(250);
  const operations =
    shared.reads.length +
    shared.writes.length +
    shared.quotas +
    shared.cooldownChecks +
    fetcher.mock.calls.length;
  expect(fetcher).toHaveBeenCalledTimes(4);
  expect(operations).toBe(44);
  expect(operations + 1).toBeLessThan(50);
});
it.each([[], [0], [6], [1.5], [NaN]].map((qualities) => ({ qualities })))(
  "rejects invalid quality selection %j before fetching",
  async ({ qualities }) => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { getPrices } = await import("../src/lib/albion/market-client");
    await expect(getPrices("europe", ["T4_BAG"], qualities)).rejects.toThrow("Invalid item batch");
    expect(fetcher).not.toHaveBeenCalled();
  },
);
