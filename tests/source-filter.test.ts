import { describe, expect, it } from "vitest";
import {
  activityForContent,
  activityOptions,
  libraryActivity,
  playerContent,
  sliceOfPages,
  splitPage,
} from "@/lib/source-filter";
import { libraryListRedirect } from "@/lib/list-redirect";

describe("merged builds and comps lists", () => {
  it("pairs only activities that are the same in both vocabularies", () => {
    expect(playerContent("MISTS_SOLO")).toBe("Solo Mists");
    expect(libraryActivity("Solo Mists")).toBe("MISTS_SOLO");
    expect(activityForContent("Solo Mists")).toBe("MISTS_SOLO");
    // No player content type is a 5v5 Hellgate, and no library activity is plain "Hellgates".
    expect(playerContent("HELLGATE_5V5")).toBeNull();
    expect(libraryActivity("Hellgates")).toBeNull();
    expect(activityForContent("Hellgates")).toBe("Hellgates");
    const all = activityOptions("", ["MISTS_SOLO", "HELLGATE_5V5"]).map((o) => o.value);
    expect(all.filter((v) => v === "MISTS_SOLO")).toHaveLength(1);
    expect(all).not.toContain("Solo Mists");
    expect(all).toContain("Hellgates");
    expect(activityOptions("library", ["MISTS_SOLO"]).map((o) => o.value)).toEqual(["MISTS_SOLO"]);
  });

  it("pages the player rows first, then the library rows, without losing or repeating one", () => {
    // 30 player rows and 50 library rows, 24 to a page.
    expect(splitPage(1, 30, 50)).toMatchObject({
      page: 1,
      pages: 4,
      playerTake: 24,
      libraryTake: 0,
    });
    expect(splitPage(2, 30, 50)).toMatchObject({ playerTake: 6, libraryStart: 0, libraryTake: 18 });
    expect(splitPage(3, 30, 50)).toMatchObject({
      playerTake: 0,
      libraryStart: 18,
      libraryTake: 24,
    });
    expect(splitPage(99, 30, 50)).toMatchObject({ page: 4, libraryStart: 42 });
    expect(splitPage(1, 0, 0)).toMatchObject({ page: 1, pages: 1, playerTake: 0 });
  });

  it("reads a slice that crosses the library's own fixed-size pages", async () => {
    const rows = Array.from({ length: 40 }, (_, i) => i);
    const loads: number[] = [];
    const load = async (page: number) => {
      loads.push(page);
      const last = Math.ceil(rows.length / 18);
      const served = Math.min(page, last);
      return { rows: rows.slice((served - 1) * 18, served * 18), page: served };
    };
    expect(await sliceOfPages(load, 10, 24, 18)).toEqual(rows.slice(10, 34));
    expect(loads).toEqual([1, 2]);
    // Past the end: the last page comes back and contributes nothing it was not asked for.
    expect(await sliceOfPages(load, 36, 24, 18)).toEqual(rows.slice(36, 40));
    expect(await sliceOfPages(load, 0, 0, 18)).toEqual([]);
  });

  it("redirects an old library list URL permanently, keeping region and filters", () => {
    const response = libraryListRedirect(
      "https://albionoutpost.com/builds/library?region=asia&family=axe&sort=newest&source=x",
      "/builds",
      (key, value) =>
        key === "sort" ? ({ newest: "recent" } as Record<string, string>)[value] : value,
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe(
      "/builds?source=library&region=asia&family=axe&sort=recent",
    );
  });
});
