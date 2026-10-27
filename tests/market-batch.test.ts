import { afterEach, expect, it, vi } from "vitest";
import { batchQuery, fetchQuoteBatch } from "../src/lib/albion/market-quotes";
afterEach(() => vi.unstubAllGlobals());
it("bounds batches and preserves distinct quality identities", () => {
  expect(batchQuery.safeParse({ region: "asia", items: "T4_BAG,T4_BAG", quality: 1 }).success).toBe(
    false,
  );
  expect(
    batchQuery.safeParse({
      region: "europe",
      items: Array.from({ length: 13 }, (_, i) => `T4_TEST${i}`).join(","),
      quality: 1,
    }).success,
  ).toBe(false);
  expect(
    batchQuery.parse({ region: "americas", items: "T4_BAG,T4_CAPE", quality: "2" }).quality,
  ).toBe(2);
});
it("batches by quality, retains missing prices and isolates a failed quality group", async () => {
  const calls: URL[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost");
      calls.push(url);
      return url.searchParams.get("quality") === "2"
        ? new Response("{}", { status: 503 })
        : Response.json({
            region: "asia",
            fetchedAt: new Date().toISOString(),
            source: "Albion Online Data Project",
            prices: [],
          });
    }),
  );
  const rows = await fetchQuoteBatch(
    "asia",
    [
      { itemId: "T4_BAG", quality: 1 },
      { itemId: "T4_CAPE", quality: 1 },
      { itemId: "T4_BAG", quality: 2 },
    ],
    new AbortController().signal,
  );
  expect(calls).toHaveLength(2);
  expect(calls[0].searchParams.get("items")).toBe("T4_BAG,T4_CAPE");
  expect(rows[0]).toEqual({ itemId: "T4_BAG", quality: 1, prices: [] });
  expect(rows[2].error).toContain("failed");
});
it("rejects cross-region and cross-quality payloads instead of displaying them", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({
      region: "europe",
      fetchedAt: new Date().toISOString(),
      source: "Albion Online Data Project",
      prices: [],
    }),
  );
  const [row] = await fetchQuoteBatch(
    "asia",
    [{ itemId: "T4_BAG", quality: 1 }],
    new AbortController().signal,
  );
  expect(row.error).toContain("identity mismatch");
});
