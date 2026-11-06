import { describe, expect, it } from "vitest";
import snapshot from "../data/catalog/ao-snapshot-20260712.json";
import { contentTypes } from "../src/lib/builds/validation";
import {
  crestColors,
  crestItems,
  decodeActivities,
  defaultCrestColor,
  encodeActivities,
  resolveCrestColor,
  teamActivities,
} from "../src/lib/groups/crest";
import { groupAction } from "../src/lib/groups/validation";

const catalog = new Map(
  (snapshot as { items: { id: string; name: string }[] }).items.map((i) => [i.id, i.name]),
);
const profile = {
  action: "profile",
  expectedUpdatedAt: "2026-11-06T12:00:00.000Z",
  name: "Ironbound Company",
  description: "",
  region: "europe",
  visibility: "PUBLIC",
};

describe("team crest", () => {
  it("offers only items from the pinned catalog, under their catalog names", () => {
    for (const [, id, name] of crestItems) expect(catalog.get(id), id).toBe(name);
    expect(new Set(crestItems.map(([, id]) => id)).size).toBe(crestItems.length);
  });

  it("keeps the team activities in step with the build activities", () => {
    expect([...teamActivities]).toEqual(contentTypes.filter((t) => t !== "Other"));
  });

  it("accepts a listed item and palette colour", () => {
    const parsed = groupAction.parse({
      ...profile,
      crestItem: "T8_2H_CLAYMORE",
      crestColor: "red",
      activities: ["ZvZ", "Arena"],
      recruiting: false,
    });
    expect(parsed).toMatchObject({
      crestItem: "T8_2H_CLAYMORE",
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

  it("gives an unset crest a stable palette colour and ignores unknown stored colours", () => {
    expect(defaultCrestColor("Ironbound")).toBe(defaultCrestColor("Ironbound"));
    expect(crestColors).toContain(defaultCrestColor("Ironbound"));
    expect(resolveCrestColor("Ironbound", "violet")).toBe("violet");
    expect(resolveCrestColor("Ironbound", "#123456")).toBe(defaultCrestColor("Ironbound"));
  });
});
