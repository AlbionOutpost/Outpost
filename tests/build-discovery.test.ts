import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { buildDiscovery, weaponFamily } from "../src/lib/build-discovery";
import { paginateLibrary } from "../src/lib/grind-library-query";
import { withBuildRegion } from "../src/lib/build-region";
import {
  bookmarkCollection,
  bookmarksSchema,
  filterCollection,
  filterSchema,
  savedFilterHref,
  buildDeviceKey,
} from "../src/lib/build-device-collections";
import type { LibraryBuild } from "../src/lib/grind-library-types";
const raw = readFileSync("public/library/grind-builds.json"),
  rows: LibraryBuild[] = JSON.parse(raw.toString());
describe("source-backed build discovery", () => {
  it("binds real counts and17families to the owned source rather than invented popularity", () => {
    expect(buildDiscovery.sourceSha256).toBe(createHash("sha256").update(raw).digest("hex"));
    expect(buildDiscovery.total).toBe(10770);
    expect(buildDiscovery.families).toHaveLength(17);
    expect(buildDiscovery.weapons).toHaveLength(142);
    expect(buildDiscovery.families.reduce((n, f) => n + f.count, 0)).toBe(rows.length);
    expect(weaponFamily("Battleaxe")).toBe("axe");
    expect(weaponFamily("Unknown weapon")).toBe("other");
  });
  it("combines exact weapon, family, activity and case-insensitive recorded tags", () => {
    const expected = rows.filter(
      (b) =>
        b.weaponName === "Battleaxe" &&
        b.category === "MISTS_SOLO" &&
        b.tags.some((t) => t.toLowerCase() === "pvp"),
    );
    const actual = paginateLibrary(
      rows,
      { weapon: "Battleaxe", family: "axe", category: "MISTS_SOLO", tag: "PVP" },
      24,
    );
    expect(actual.matched).toBe(expected.length);
    expect(actual.rows).toEqual(expected.slice(0, 24));
    expect(paginateLibrary(rows, { weapon: "Battleaxe", family: "bow" }, 24).matched).toBe(0);
  });
  it("sorts real source update timestamps and bounds requested pages", () => {
    const expected = rows
      .filter((b) => b.weaponName === "Battleaxe")
      .toSorted((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const actual = paginateLibrary(rows, { weapon: "Battleaxe", sort: "newest", page: 1 }, 24);
    expect(actual.rows).toEqual(expected.slice(0, 24));
    expect(paginateLibrary(rows, { weapon: "Battleaxe", page: 999999 }, 24).page).toBe(
      actual.pages,
    );
  });
});
const saved = {
  id: "public-build",
  slug: "battleaxe-mist-build",
  title: "Battleaxe Mist Build",
  author: "Creator",
  weaponName: "Battleaxe",
  category: "MISTS_SOLO",
  itemId: "T8_MAIN_AXE",
  updatedAt: "2026-10-27T12:00:00Z",
};
describe("bounded device build collections", () => {
  it("preserves the active server across discovery links without dropping filters or anchors", () => {
    const href = withBuildRegion(
      "/builds/library?region=europe&weapon=Battleaxe&view=list#results",
      "asia",
    );
    expect(href).toContain("region=asia");
    expect(href).toContain("weapon=Battleaxe");
    expect(href).toContain("view=list");
    expect(href.endsWith("#results")).toBe(true);
    expect(withBuildRegion("https://external.example/path", "asia")).toBe(
      "https://external.example/path",
    );
  });
  it("isolates regions, deduplicates public references and preserves parse failures", () => {
    const encoded = JSON.stringify({ version: 1, region: "europe", builds: [saved] });
    expect(bookmarkCollection(encoded, "europe").builds).toEqual([saved]);
    expect(() => bookmarkCollection(encoded, "asia")).toThrow("another server");
    expect(() => bookmarkCollection("{broken", "europe")).toThrow();
    expect(
      bookmarksSchema.safeParse({ version: 1, region: "europe", builds: [saved, saved] }).success,
    ).toBe(false);
    expect(buildDeviceKey("bookmarks", "europe")).not.toBe(buildDeviceKey("bookmarks", "asia"));
  });
  it("refuses external navigation, private ownership parameters and oversized storage", () => {
    const filter = {
      id: "filter",
      name: "Mists",
      path: "/builds/library" as const,
      query: { category: "MISTS_SOLO", q: "axe & shield", sort: "newest" },
    };
    const href = savedFilterHref(filter, "europe");
    expect(href).toContain("q=axe+%26+shield");
    expect(href).toContain("region=europe");
    expect(filterSchema.safeParse({ ...filter, path: "https://attacker.example" }).success).toBe(
      false,
    );
    expect(
      filterSchema.safeParse({ ...filter, query: { authorId: "another-account" } }).success,
    ).toBe(false);
    expect(
      bookmarksSchema.safeParse({
        version: 1,
        region: "europe",
        builds: [{ ...saved, slug: "../private" }],
      }).success,
    ).toBe(false);
    expect(() => filterCollection(" ".repeat(20001), "europe")).toThrow("device limit");
  });
  it("caps devicefavorites at100 and filterpresets at8 without server mutation", () => {
    const many = Array.from({ length: 101 }, (_, n) => ({ ...saved, id: `build-${n}` }));
    expect(bookmarksSchema.safeParse({ version: 1, region: "europe", builds: many }).success).toBe(
      false,
    );
    const filters = Array.from({ length: 9 }, (_, n) => ({
      id: `filter-${n}`,
      name: "Mists",
      path: "/builds/library",
      query: { q: "axe" },
    }));
    expect(() =>
      filterCollection(JSON.stringify({ version: 1, region: "europe", filters }), "europe"),
    ).toThrow();
  });
});
