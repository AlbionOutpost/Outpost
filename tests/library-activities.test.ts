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
  it("counts builds, ranks weapons by likes and names the most liked build", () => {
    const rows = [
      build("a", "ZVZ", 3, "T8_MAIN_MACE"),
      build("b", "ZVZ", 9, "T8_2H_HAMMER"),
      build("c", "ZVZ", 5, "T8_2H_HAMMER"),
      build("d", "ZVZ", 1, "T8_MAIN_SWORD"),
      build("e", "ZVZ", 0, "T8_2H_BOW"),
      build("f", "SMALL_SCALE", 0, "T8_2H_BOW"),
    ];
    const [zvz, small] = summariseActivities(rows);
    expect(zvz).toEqual({
      category: "ZVZ",
      name: "ZvZ",
      builds: 5,
      weapons: ["T8_2H_HAMMER", "T8_MAIN_MACE", "T8_MAIN_SWORD"],
      top: { title: "Build b", slug: "b", upvotes: 9 },
    });
    // No likes recorded: no "most liked" claim.
    expect(small.top).toBeNull();
    expect(small.builds).toBe(1);
  });
  it("keeps every landing activity, empty ones included", () => {
    const summary = summariseActivities([]);
    expect(summary.map((a) => a.category)).toEqual([...landingActivities]);
    expect(summary.every((a) => a.builds === 0 && a.weapons.length === 0)).toBe(true);
  });
});
