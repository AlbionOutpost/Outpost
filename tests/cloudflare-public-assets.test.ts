import { describe, it, expect, vi } from "vitest";
const fixture = vi.hoisted(() => new Map<string, unknown>());
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({
    env: {
      OUTPOST_DATA: { query: async () => ({ ok: false, error: { kind: "unavailable" } }) },
      ASSETS: {
        fetch: async (r: Request) => {
          const name = new URL(r.url).pathname.split("/").at(-1)!;
          return fixture.has(name)
            ? Response.json(fixture.get(name))
            : new Response("", { status: 404 });
        },
      },
    },
  }),
}));
import { db as remoteDb } from "../cloudflare/database/web-driver";
import {
  publicCatalogQuery,
  publicLibraryFind,
  publicLibraryPage,
  readPublicAsset,
} from "../cloudflare/database/public-assets";
const item = {
  id: "T4_MAIN_AXE",
  name: "Battleaxe",
  slot: "Main hand",
  tier: 4,
  enchantment: 0,
  itemPower: 700,
  active: true,
  releaseId: "public-release",
  abilities: [],
  recipe: null,
};
function setup() {
  fixture.set("catalog-index.json", {
    items: [{ ...item, shard: "catalog-0.json" }],
    releases: [{ id: "public-release", version: "reviewed" }],
  });
  fixture.set("catalog-0.json", [item]);
  const rows = [
    {
      id: "one",
      slug: "first",
      title: "Battleaxe",
      author: "Player",
      category: "PVE",
      weaponName: "Battleaxe",
      tags: ["solo"],
      updatedAt: "2026-04-01T00:00:00Z",
      upvotes: 1,
      shard: "builds-0.json",
    },
    {
      id: "two",
      slug: "second",
      title: "Bow",
      author: "Other",
      category: "PVP",
      weaponName: "Bow",
      tags: [],
      updatedAt: "2026-05-01T00:00:00Z",
      upvotes: 4,
      shard: "builds-0.json",
    },
    // Stored for comps but not listed: older and never liked
    {
      id: "three",
      slug: "third",
      title: "Old solo",
      author: "Player",
      category: "PVE",
      weaponName: "Battleaxe",
      tags: ["solo"],
      updatedAt: "2025-01-01T00:00:00Z",
      upvotes: 0,
      shard: "builds-0.json",
    },
  ];
  fixture.set("builds-index.json", rows);
  fixture.set(
    "builds-0.json",
    rows.map((r) => ({ ...r, equipment: [], description: "Public fixture" })),
  );
}
describe("public snapshot reads during D1 unavailability", () => {
  it("retains identity, quality-independent metadata, filters, counts and selected fields", async () => {
    setup();
    expect(
      await publicCatalogQuery({
        model: "itemMetadata",
        operation: "count",
        args: {
          where: {
            active: true,
            tier: 4,
            OR: [{ name: { contains: "AXE", mode: "insensitive" } }, { id: { contains: "AXE" } }],
          },
        },
      }),
    ).toBe(1);
    expect(
      await publicCatalogQuery({
        model: "itemMetadata",
        operation: "findMany",
        args: { where: { tier: 5 }, take: 30 },
      }),
    ).toEqual([]);
    expect(
      await publicCatalogQuery({
        model: "itemMetadata",
        operation: "findUnique",
        args: { where: { id: item.id }, select: { name: true, itemPower: true } },
      }),
    ).toEqual({ name: "Battleaxe", itemPower: 700 });
    expect(
      await publicCatalogQuery({
        model: "itemMetadata",
        operation: "count",
        args: { where: { name: { contains: "a".repeat(100) } } },
      }),
    ).toBe(0);
  });
  it("loads bounded page details and exact requested public references", async () => {
    setup();
    const page = await publicLibraryPage("builds", { q: "solo", page: 9999 });
    // Listed builds only (2026, liked at least once); the unlisted one is still findable
    expect(page.total).toBe(2);
    expect(page.matched).toBe(1);
    expect(page.page).toBe(1);
    expect(page.rows.map((r) => r.id)).toEqual(["one"]);
    expect((await publicLibraryFind("builds", ["second"]))[0].id).toBe("two");
    expect((await publicLibraryFind("builds", ["third"]))[0].id).toBe("three");
    expect(await publicLibraryFind("builds", ["unknown"])).toEqual([]);
    // Most liked first
    expect((await publicLibraryPage("builds", { page: 1 })).rows.map((r) => r.id)).toEqual([
      "two",
      "one",
    ]);
  });
  it("falls back for a public catalog transaction while keeping private failures closed", async () => {
    setup();
    const [rows, count] = await remoteDb.$transaction([
      remoteDb.itemMetadata.findMany({ where: { tier: 4 }, select: { id: true } }),
      remoteDb.itemMetadata.count({ where: { tier: 4 } }),
    ]);
    expect(rows).toEqual([{ id: item.id }]);
    expect(count).toBe(1);
    await expect(remoteDb.savedScenario.findMany()).rejects.toThrow("Private database unavailable");
  });
  it("preserves SQLite binary ID ordering across enchantments and suffixes", async () => {
    setup();
    const rows = [item, { ...item, id: "T4_MAIN_AXE_EXTRA" }, { ...item, id: "T4_MAIN_AXE@1" }];
    fixture.set("catalog-index.json", {
      items: rows.map((r) => ({ ...r, shard: "catalog-0.json" })),
      releases: [],
    });
    fixture.set("catalog-0.json", rows);
    expect(
      await publicCatalogQuery({
        model: "itemMetadata",
        operation: "findMany",
        args: { orderBy: { id: "asc" }, select: { id: true } },
      }),
    ).toEqual([{ id: "T4_MAIN_AXE" }, { id: "T4_MAIN_AXE@1" }, { id: "T4_MAIN_AXE_EXTRA" }]);
  });
  it("rejects private models, mutations, unknown filters and arbitrary asset paths", async () => {
    setup();
    await expect(publicCatalogQuery({ model: "user", operation: "findMany" })).rejects.toThrow();
    await expect(
      publicCatalogQuery({ model: "itemMetadata", operation: "deleteMany" }),
    ).rejects.toThrow();
    await expect(
      publicCatalogQuery({
        model: "itemMetadata",
        operation: "findMany",
        args: { where: { authorId: "private" } },
      }),
    ).rejects.toThrow();
    await expect(readPublicAsset("../../.env")).rejects.toThrow();
    await expect(publicLibraryFind("users", [])).rejects.toThrow();
  });
});
