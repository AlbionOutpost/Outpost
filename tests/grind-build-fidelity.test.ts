import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createLibraryBuildDraft } from "../src/lib/grind-build-draft";
import { safeYouTubeLink } from "../src/components/library-build-metadata";
import type { LibraryBuild } from "../src/lib/grind-library-types";
const builds: LibraryBuild[] = JSON.parse(readFileSync("public/library/grind-builds.json", "utf8"));
const names = JSON.parse(readFileSync("public/library/grind-spell-names.json", "utf8"));
const battleaxe = builds.find((b) => b.slug === "battleaxe-mist-build")!;

it("preserves recorded armor swaps, all three awakening recommendations, tags and canonical creator links", () => {
  expect(battleaxe.recommendedTraits).toEqual([
    "cooldown-rate",
    "ability-damage",
    "defense-vs-all",
  ]);
  expect(battleaxe.tags).toEqual(["Meta", "PVP"]);
  expect(battleaxe.equipment.find((e) => e.slot === "Helmet")?.alternativeSkills).toEqual({
    T8_HEAD_CLOTH_HELL: ["PURGE_HELMET", "PASSIVE_INCREASED_DAMAGE"],
  });
  expect(battleaxe.videos).toEqual([
    { kind: "video", id: "vtDHrCPH6c4", url: "https://www.youtube.com/watch?v=vtDHrCPH6c4" },
  ]);
  const traits = JSON.parse(readFileSync("public/library/grind-traits.json", "utf8"));
  expect(traits).toHaveLength(19);
  expect(traits.find((t: { id: string }) => t.id === "ability-damage")).toMatchObject({
    name: "Ability Damage",
    range: "0.165% - 16.5%",
  });
  expect(builds.every((b) => b.videos.every((v) => safeYouTubeLink(v.url)))).toBe(true);
});

it("makes supported alternative abilities into independent private spare sets without changing the primary loadout", () => {
  const draft = createLibraryBuildDraft(battleaxe, names)!;
  expect(draft.visibility).toBe("PRIVATE");
  expect(draft.equipmentSets).toHaveLength(3);
  expect(draft.equipment.find((e) => e.slot === "Helmet")?.itemId).toBe("T8_HEAD_LEATHER_SET2");
  const swap = draft.equipmentSets.find((s) => s.name.startsWith("Helmet swap"))!;
  expect(swap.equipment.find((e) => e.slot === "Helmet")).toMatchObject({
    itemId: "T8_HEAD_CLOTH_HELL",
    abilities: { Active: "Purge" },
  });
  expect(draft.strategy).toContain("Archived awakening recommendations: cooldown-rate");
  expect(draft.strategy).toContain("https://www.youtube.com/watch?v=vtDHrCPH6c4");
  draft.equipment.find((e) => e.slot === "Main hand")!.abilitySelections.E = "changed";
  expect(
    draft.equipmentSets.every(
      (s) => s.equipment.find((e) => e.slot === "Main hand")?.abilities.E === "Blood Bandit",
    ),
  ).toBe(true);
});

it("rejects executable/foreign/tracking URLs at the rendering boundary", () => {
  for (const href of [
    "javascript:alert(1)",
    "https://youtube.com.evil.example/watch?v=vtDHrCPH6c4",
    "https://user:pass@www.youtube.com/watch?v=vtDHrCPH6c4",
    "https://www.youtube.com/watch?v=vtDHrCPH6c4&tracking=bad",
  ])
    expect(safeYouTubeLink(href)).toBe(false);
  expect(safeYouTubeLink("https://www.youtube.com/@jDof1")).toBe(true);
});

it("keeps unsupported source spells in notes instead of guessing selections", () => {
  const source = structuredClone(battleaxe);
  source.equipment.find((e) => e.slot === "Main hand")!.skills.push("UNKNOWN_CAPTURED_SPELL");
  const draft = createLibraryBuildDraft(source, names)!;
  expect(draft.equipment.find((e) => e.slot === "Main hand")?.abilities).toContain(
    "UNKNOWN_CAPTURED_SPELL",
  );
  expect(JSON.stringify(draft.equipmentSets)).not.toContain("UNKNOWN_CAPTURED_SPELL");
});
