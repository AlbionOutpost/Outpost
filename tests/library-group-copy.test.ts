import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { copyLibraryGroup } from "@/lib/compositions/library-group";
import { buildCompositionLaunch, compositionLaunchPath } from "@/lib/compositions/build-launch";
import { safeSignInReturn } from "@/lib/sign-in-return";
import type { LibraryBuild, LibraryComposition } from "@/lib/grind-library-types";
const builds = JSON.parse(
  readFileSync("public/library/grind-builds.json", "utf8"),
) as LibraryBuild[];
const source = builds.find((row) => row.slug === "battleaxe-mist-build")!;
const names = JSON.parse(readFileSync("public/library/grind-spell-names.json", "utf8"));
const comp: LibraryComposition = {
  slug: "qa-pair",
  title: "Paired loadouts",
  author: "Fixture",
  category: "ZVZ",
  description: "Independent test",
  updatedAt: "2026-10-29T00:00:00Z",
  members: [source.id, source.id],
  optional: [source.id],
};
it("copies every duplicate member position with independent IDs, spells, swaps and optional flags", () => {
  const before = JSON.stringify(source),
    copy = copyLibraryGroup(comp, [source], names, "asia").initial;
  expect(copy.slots).toHaveLength(2);
  expect(copy.slots[0].id).not.toBe(copy.slots[1].id);
  expect(copy.region).toBe("asia");
  expect(copy.visibility).toBe("PRIVATE");
  expect(copy.groupId).toBeNull();
  expect(copy.slots.every((slot) => !slot.mandatory && slot.sourceBuildId === null)).toBe(true);
  expect(copy.slots[0].equipment.find((row) => row.slot === "Main hand")!.abilities.E).toBe(
    "Blood Bandit",
  );
  expect(copy.slots[0].equipmentSets).toHaveLength(3);
  copy.slots[0].equipment[0].quality = 4;
  expect(copy.slots[1].equipment[0].quality).toBe(1);
  expect(JSON.stringify(source)).toBe(before);
});
it("refuses partial copies and rejects unsupported source combinations across sign-in", () => {
  expect(() =>
    copyLibraryGroup({ ...comp, members: [source.id, "missing"] }, [source], names, "europe"),
  ).toThrow("No partial");
  expect(() =>
    copyLibraryGroup(
      { ...comp, members: Array.from({ length: 100 }, () => source.id) },
      [source],
      names,
      "europe",
    ),
  ).toThrow("64KB composition save limit");
  const destination = compositionLaunchPath({ fromComposition: "qa-pair", region: "asia" });
  expect(safeSignInReturn(destination)).toBe(destination);
  expect(
    buildCompositionLaunch.safeParse({ fromComposition: "qa-pair", fromBuild: "private" }).success,
  ).toBe(false);
  expect(buildCompositionLaunch.safeParse({ fromComposition: "../private" }).success).toBe(false);
});
