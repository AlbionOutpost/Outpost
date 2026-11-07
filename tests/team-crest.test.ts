import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { contentTypes } from "../src/lib/builds/validation";
import {
  crestColors,
  crestCharges,
  decodeActivities,
  defaultCrest,
  resolveCrestCharge,
  encodeActivities,
  resolveCrestColor,
  slugFromName,
  teamActivities,
  teamSlug,
} from "../src/lib/groups/crest";
import { groupAction } from "../src/lib/groups/validation";

const profile = {
  action: "profile",
  expectedUpdatedAt: "2026-11-06T12:00:00.000Z",
  name: "Ironbound Company",
  description: "",
  region: "europe",
  visibility: "PUBLIC",
};

describe("team crest", () => {
  it("offers each painted symbol and shield once, each with its artwork", () => {
    expect(new Set(crestCharges).size).toBe(crestCharges.length);
    expect(new Set(crestColors).size).toBe(crestColors.length);
    for (const c of crestCharges)
      expect(existsSync(`public/albion/charges/${c}.webp`), c).toBe(true);
    for (const c of crestColors)
      expect(existsSync(`public/albion/crests/crest-${c}.webp`), c).toBe(true);
  });

  it("keeps the team activities in step with the build activities", () => {
    expect([...teamActivities]).toEqual(contentTypes.filter((t) => t !== "Other"));
  });

  it("accepts a listed symbol and shield", () => {
    const parsed = groupAction.parse({
      ...profile,
      crestItem: "wolf",
      crestColor: "red",
      activities: ["ZvZ", "Arena"],
      recruiting: false,
    });
    expect(parsed).toMatchObject({
      crestItem: "wolf",
      crestColor: "red",
      activities: ",ZvZ,Arena,",
      recruiting: false,
    });
  });

  it("defaults to the monogram, no activities and recruiting", () => {
    expect(groupAction.parse(profile)).toMatchObject({
      crestItem: null,
      crestColor: null,
      activities: "",
      recruiting: true,
    });
  });

  it.each([
    { crestItem: "T8_MAIN_SWORD@3" },
    { crestItem: "T4_MAIN_SWORD" },
    { crestItem: "dragon" },
    { crestItem: "https://example.com/logo.png" },
    { crestItem: "" },
    { crestColor: "#ff0000" },
    { crestColor: "pink" },
    { activities: ["ZvZ", "ZvZ"] },
    { activities: ["ZvZ", "Arena", "Ganking", "Roaming"] },
    { activities: ["Other"] },
    { activities: "ZvZ" },
    { recruiting: "yes" },
  ])("rejects %o", (field) => {
    expect(groupAction.safeParse({ ...profile, ...field }).success).toBe(false);
  });

  it("matches whole activity names, so Arena never finds Crystal Arena", () => {
    const stored = encodeActivities(["Crystal Arena"]);
    expect(stored.includes(",Arena,")).toBe(false);
    expect(stored.includes(",Crystal Arena,")).toBe(true);
    expect(decodeActivities(stored)).toEqual(["Crystal Arena"]);
    expect(decodeActivities(",ZvZ,Not an activity,")).toEqual(["ZvZ"]);
    expect(decodeActivities(null)).toEqual([]);
  });

  it("shows the default crest until one is picked, and for anything unknown or legacy", () => {
    expect(resolveCrestColor(null)).toBe(defaultCrest.color);
    expect(resolveCrestColor("violet")).toBe("violet");
    expect(resolveCrestColor("#123456")).toBe(defaultCrest.color);
    expect(resolveCrestColor("crimson")).toBe("red");
    expect(resolveCrestCharge(null)).toBe(defaultCrest.charge);
    expect(resolveCrestCharge("wolf")).toBe("wolf");
    expect(resolveCrestCharge("T8_2H_CLAYMORE")).toBe(defaultCrest.charge);
  });
});

describe("workspace address from a name", () => {
  it("derives an address the create API accepts", () => {
    for (const [name, slug] of [
      ["Ironbound Company", "ironbound-company"],
      ["  Les Épées d'Or  ", "les-epees-d-or"],
      ["ZvZ -- Night Watch!!", "zvz-night-watch"],
      ["Ωmega", "mega"],
      ["x".repeat(59) + " y", "x".repeat(59)],
    ] as const) {
      expect(slugFromName(name)).toBe(slug);
      expect(teamSlug.safeParse(slug).success).toBe(true);
    }
    expect(slugFromName("!!!")).toBe("");
    expect(teamSlug.safeParse("Bad--slug").success).toBe(false);
  });
});
