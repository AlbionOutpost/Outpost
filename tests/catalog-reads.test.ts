// Catalog reads stay index-friendly without changing what they return.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn(),
  findFirst = vi.fn(),
  count = vi.fn();
vi.mock("@/lib/db", () => ({
  db: {
    itemMetadata: {
      findMany: (args: unknown) => findMany(args),
      findFirst: (args: unknown) => findFirst(args),
      count: (args: unknown) => count(args),
    },
    $transaction: (queries: Promise<unknown>[]) => Promise.all(queries),
  },
}));
const { activeCatalogIds, catalogSlots, catalogVariants, searchCatalog } =
  await import("../src/lib/catalog/item-search");
const { remember } = await import("../cloudflare/database/public-cache");

beforeEach(() => vi.resetAllMocks());

describe("item catalog reads", () => {
  it("looks variants up by id alone and drops inactive ones after the read", async () => {
    findMany.mockResolvedValue([
      { id: "T4_MAIN_SWORD", tier: 4, enchantment: 0, active: true, itemPower: 700 },
      { id: "T4_MAIN_SWORD@1", tier: 4, enchantment: 1, active: false, itemPower: 800 },
    ]);
    expect(await catalogVariants("T4_MAIN_SWORD")).toEqual([
      { id: "T4_MAIN_SWORD", tier: 4, enchantment: 0, itemPower: 700 },
    ]);
    expect(findMany.mock.calls[0][0].where).toEqual({ id: { in: expect.any(Array) } });
    expect(await catalogVariants("not an id")).toEqual([]);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("keeps only active ids for recipe links", async () => {
    findMany.mockResolvedValue([
      { id: "A", active: true },
      { id: "B", active: false },
    ]);
    expect(await activeCatalogIds(["A", "B", "C"])).toEqual(new Set(["A"]));
    expect(findMany.mock.calls[0][0].where).toEqual({ id: { in: ["A", "B", "C"] } });
    expect(await activeCatalogIds([])).toEqual(new Set());
  });

  it("lists the slots that have an active item, A–Z, one row each", async () => {
    findFirst.mockImplementation(async ({ where }: { where: { slot: string } }) =>
      ["Potion", "Bag", "Main hand"].includes(where.slot) ? { slot: where.slot } : null,
    );
    expect(await catalogSlots()).toEqual(["Bag", "Main hand", "Potion"]);
    expect(findFirst).toHaveBeenCalledTimes(10);
    expect(findFirst.mock.calls[0][0].where).toEqual({ active: true, slot: "Main hand" });
  });

  it("adds no name filter for an empty search and keeps it for a real one", async () => {
    count.mockResolvedValue(0);
    findMany.mockResolvedValue([]);
    await searchCatalog({ search: "", page: 1 });
    expect(count.mock.calls[0][0].where).not.toHaveProperty("OR");
    await searchCatalog({ search: "bow", page: 1 });
    expect(count.mock.calls.at(-1)![0].where.OR).toEqual([
      { name: { contains: "bow", mode: "insensitive" } },
      { id: { contains: "bow", mode: "insensitive" } },
    ]);
  });
});

describe("public read cache", () => {
  afterEach(() => vi.useRealTimers());
  it("serves a repeat read for five minutes, then reads again", async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => ({ n: load.mock.calls.length }));
    expect(await remember("cache-test", load)).toEqual({ n: 1 });
    expect(await remember("cache-test", load)).toEqual({ n: 1 });
    vi.advanceTimersByTime(5 * 60_000 + 1);
    expect(await remember("cache-test", load)).toEqual({ n: 2 });
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("never keeps a failed read or an oversized key", async () => {
    const failing = vi.fn(async () => {
      throw new Error("down");
    });
    await expect(remember("cache-fail", failing)).rejects.toThrow("down");
    await expect(remember("cache-fail", failing)).rejects.toThrow("down");
    expect(failing).toHaveBeenCalledTimes(2);
    const load = vi.fn(async () => 1);
    await remember("x".repeat(5000), load);
    await remember("x".repeat(5000), load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
