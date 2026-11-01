import { describe, expect, it } from "vitest";
import { landingActivities, summariseActivities } from "@/lib/library-activities";
import type { LibraryBuild } from "@/lib/grind-library-types";

const build = (id: string, category: string, upvotes: number, weapon: string) =>
  ({
    id,
    slug: id,
    title: `Build ${id}`,
    category,
    upvotes,
    equipment: [{ slot: "Main hand", itemId: weapon }],
  }) as unknown as LibraryBuild;

describe("landing activity summary", () => {
  it("counts builds and lists the five most liked with their weapons", () => {
    const rows = [
      build("a", "ZVZ", 3, "T8_MAIN_MACE"),
      build("b", "ZVZ", 9, "T8_2H_HAMMER"),
      build("c", "ZVZ", 5, "T8_2H_HAMMER"),
      build("d", "ZVZ", 1, "T8_MAIN_SWORD"),
      build("e", "ZVZ", 0, "T8_2H_BOW"),
      build("f", "SMALL_SCALE", 0, "T8_2H_BOW"),
    ];
    const [zvz, small] = summariseActivities(rows);
    expect(zvz.category).toBe("ZVZ");
    expect(zvz.name).toBe("ZvZ");
    expect(zvz.builds).toBe(5);
    // Most liked first, unliked builds left out, weapon from the main hand
    expect(zvz.top).toEqual([
      { title: "Build b", slug: "b", upvotes: 9, itemId: "T8_2H_HAMMER" },
      { title: "Build c", slug: "c", upvotes: 5, itemId: "T8_2H_HAMMER" },
      { title: "Build a", slug: "a", upvotes: 3, itemId: "T8_MAIN_MACE" },
      { title: "Build d", slug: "d", upvotes: 1, itemId: "T8_MAIN_SWORD" },
    ]);
    // No likes recorded: no "most liked" claim.
    expect(small.top).toEqual([]);
    expect(small.builds).toBe(1);
  });
  it("keeps every landing activity, empty ones included", () => {
    const summary = summariseActivities([]);
    expect(summary.map((a) => a.category)).toEqual([...landingActivities]);
    expect(summary.every((a) => a.builds === 0 && a.top.length === 0)).toBe(true);
  });
});
