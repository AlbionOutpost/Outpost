import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  copyBuildLoadout,
  copyLibraryLoadout,
  compositionFromLoadout,
} from "../src/lib/compositions/build-loadout";
import {
  compositionLaunchPath,
  buildCompositionLaunch,
} from "../src/lib/compositions/build-launch";
import { safeSignInReturn } from "../src/lib/sign-in-return";
import type { LibraryBuild } from "../src/lib/grind-library-types";
const setId = "10000000-0000-4000-8000-000000000001",
  copyId = "20000000-0000-4000-8000-000000000002";
function source() {
  return {
    id: "source-build",
    title: "Battleaxe expedition",
    description: "Original description",
    strategy: "Original strategy",
    contentType: "Solo Mists",
    equipmentSets: [
      {
        id: setId,
        name: "Named spare",
        equipment: [
          {
            slot: "Main hand",
            itemId: "T4_MAIN_AXE",
            quality: 3,
            abilities: { E: "Blood Bandit" },
            alternatives: [],
          },
        ],
      },
    ],
    equipment: [
      {
        slot: "Main hand",
        itemId: "T4_MAIN_AXE",
        quality: 3,
        abilitySelections: { E: "Blood Bandit" } as Record<string, string>,
        alternativeItemIds: ["T4_MAIN_AXE@1"],
        abilities: "An author reminder, not an ability choice",
        alternatives: "Unvalidated alternative note",
      },
      {
        slot: "Off hand",
        itemId: "T4_OFF_SHIELD",
        quality: 2,
        abilitySelections: {} as Record<string, string>,
        alternativeItemIds: [] as string[],
        abilities: "",
        alternatives: "",
      },
    ],
  };
}
describe("validated independent build-to-composition copy", () => {
  it("copies equipment, selected abilities, alternatives and named sets without mutating its source", () => {
    const original = source(),
      before = JSON.stringify(original),
      copied = copyBuildLoadout(original, { idFactory: () => copyId });
    expect(copied.sourceBuildId).toBe(original.id);
    expect(copied.equipment[0]).toMatchObject({
      quality: 3,
      abilities: { E: "Blood Bandit" },
      alternatives: ["T4_MAIN_AXE@1"],
    });
    expect(copied.equipmentSets[0].id).toBe(copyId);
    expect(copied.equipmentSets[0].id).not.toBe(setId);
    expect(copied.notes).toContain("author reminder");
    expect(copied.compositionNotes).toContain("Original strategy");
    copied.equipment[0].quality = 1;
    copied.equipmentSets[0].name = "Changed independently";
    expect(JSON.stringify(original)).toBe(before);
  });
  it("defaults to PRIVATE with no group and one unassigned Custom member, applying only an explicit role", () => {
    const copied = copyBuildLoadout(source(), { idFactory: () => copyId });
    const { initial } = compositionFromLoadout(copied, "asia", undefined, () => copyId);
    expect(initial).toMatchObject({ region: "asia", visibility: "PRIVATE", groupId: null });
    expect(initial.slots).toHaveLength(1);
    expect(initial.slots[0]).toMatchObject({
      role: "Custom",
      customRole: "Unassigned",
      sourceBuildId: "source-build",
    });
    expect(
      compositionFromLoadout(copied, "europe", "Healer", () => copyId).initial.slots[0],
    ).toMatchObject({ role: "Healer", customRole: "" });
  });
  it.each([
    "unknown-item",
    "wrong-ability",
    "duplicate-slot",
    "two-handed-offhand",
    "unsupported-alternative",
    "invalid-spare",
    "empty-loadout",
    "missing-main-hand",
  ])("rejects %s rather than dropping unsupported fields", (kind) => {
    const original = source();
    if (kind === "unknown-item") original.equipment[0].itemId = "T4_NOT_SUPPORTED";
    if (kind === "wrong-ability")
      original.equipment[0].abilitySelections = { E: "Not a real selection" };
    if (kind === "duplicate-slot") original.equipment.push({ ...original.equipment[0] });
    if (kind === "two-handed-offhand")
      original.equipment[0] = {
        ...original.equipment[0],
        itemId: "T4_2H_BOW",
        abilitySelections: {} as Record<string, string>,
      };
    if (kind === "unsupported-alternative")
      original.equipment[0].alternativeItemIds = ["T4_HEAD_CLOTH_SET1"];
    if (kind === "invalid-spare") original.equipmentSets[0].equipment[0].itemId = "T4_FAKE";
    if (kind === "empty-loadout") original.equipment = [];
    if (kind === "missing-main-hand")
      original.equipment = original.equipment.filter((row) => row.slot !== "Main hand");
    expect(() => copyBuildLoadout(original)).toThrow("cannot be copied safely");
  });
  it("keeps freeform notes separate and reports bounded truncation", () => {
    const original = source();
    original.equipment[0].abilities = "Author guidance ".repeat(1000);
    original.strategy = "Strategy ".repeat(2000);
    const copy = copyBuildLoadout(original);
    expect(copy.notes.length).toBe(2000);
    expect(copy.compositionNotes.length).toBe(12000);
    expect(copy.notice).toContain("shortened");
    expect(copy.equipment[0].abilities).toEqual({ E: "Blood Bandit" });
  });
  const library: LibraryBuild = JSON.parse(
      readFileSync("public/library/grind-builds.json", "utf8"),
    ).find((b: LibraryBuild) => b.slug === "battleaxe-mist-build"),
    names = JSON.parse(readFileSync("public/library/grind-spell-names.json", "utf8"));
  it("translates recorded library abilities and preserves swaps with a null attached database id", () => {
    const before = JSON.stringify(library),
      copied = copyLibraryLoadout(library, names);
    expect(copied.sourceBuildId).toBeNull();
    expect(copied.title).toBe(library.title);
    expect(copied.equipment.map((e) => e.itemId)).toEqual(library.equipment.map((e) => e.itemId));
    expect(copied.equipment.find((e) => e.slot === "Main hand")?.abilities.E).toBeTruthy();
    expect(copied.equipmentSets.length).toBeGreaterThan(0);
    expect(compositionFromLoadout(copied, "asia").initial.slots[0].sourceBuildId).toBeNull();
    expect(JSON.stringify(library)).toBe(before);
  });
  it("does not silently remove unsupported library swaps", () => {
    const invalid = structuredClone(library);
    invalid.equipment[0].alternatives.push("T8_HEAD_CLOTH_SET1");
    expect(() => copyLibraryLoadout(invalid, names)).toThrow("cannot be copied safely");
  });
});
describe("narrow sign-in return destination", () => {
  it("canonicalizes an explicitly validated composition source/server/role", () => {
    const input = "/compositions/new?role=Healer&region=asia&fromBuild=public-build";
    expect(safeSignInReturn(input)).toBe(
      "/compositions/new?fromBuild=public-build&region=asia&role=Healer",
    );
    expect(compositionLaunchPath({ fromLibrary: "battleaxe-mist-build", region: "europe" })).toBe(
      "/compositions/new?fromLibrary=battleaxe-mist-build&region=europe",
    );
    expect(safeSignInReturn("/compositions/new")).toBe("/compositions/new");
  });
  it.each([
    "https://evil.example/compositions/new",
    "//evil.example",
    "/\\evil.example",
    "/compositions\\new?fromBuild=ok",
    "/settings?callbackUrl=//evil.example",
    "/compositions/new#external",
    "/compositions/new?fromBuild=one&fromBuild=two",
    "/compositions/new?fromBuild=one&fromLibrary=two",
    "/compositions/new?role=Admin",
    "/compositions/new?region=unknown",
    "/compositions/new?fromBuild=..%2Fprivate",
    "/compositions/new?fromLibrary=%252Fprivate",
    "/compositions/new?callbackUrl=https://evil.example",
    "/compositions/new?fromBuild=" + "a".repeat(101),
    "/compositions/new?fromLibrary=" + "a".repeat(201),
    "/compositions/new?fromBuild=valid\n",
    " ",
    "/",
  ])("rejects %s to the fixed settings fallback", (value) => {
    expect(safeSignInReturn(value)).toBe("/settings");
  });
  it("defaults to settings and rejects unknown launch properties", () => {
    expect(safeSignInReturn(undefined)).toBe("/settings");
    expect(safeSignInReturn("/settings")).toBe("/settings");
    expect(buildCompositionLaunch.safeParse({ fromBuild: "ok", authorId: "other" }).success).toBe(
      false,
    );
  });
});
