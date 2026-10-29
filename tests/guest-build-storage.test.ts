import { expect, it } from "vitest";
import { buildInput } from "@/lib/builds/validation";
import {
  guestBuildStorageKey,
  legacyGuestBuildKey,
  readGuestBuildDraft,
  writeGuestBuildDraft,
} from "@/lib/guest-build-storage";

const draft = buildInput.parse({
  title: "Guest build",
  description: "",
  contentType: "Other",
  region: "europe",
  visibility: "PRIVATE",
  playerCount: 1,
  recommendedIP: 0,
  strategy: "",
  patchNotes: "",
  equipmentSets: [],
  equipment: [
    {
      slot: "Main hand",
      itemId: "T4_MAIN_AXE",
      quality: 1,
      abilities: "",
      alternatives: "",
      abilitySelections: {},
      alternativeItemIds: [],
    },
  ],
});
function storage() {
  const records = new Map<string, string>();
  return {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
  };
}
it("keeps the legacy plain-new key while isolating source copies and regions", () => {
  const device = storage(),
    europe = guestBuildStorageKey("new:axe:europe", true),
    asia = guestBuildStorageKey("new:axe:asia", true),
    other = guestBuildStorageKey("new:bow:europe", true);
  expect(guestBuildStorageKey("new:blank:preferred")).toBe(legacyGuestBuildKey);
  writeGuestBuildDraft(device, legacyGuestBuildKey, draft);
  writeGuestBuildDraft(device, europe, { ...draft, title: "Europe source copy" });
  expect(readGuestBuildDraft(device, europe)).toMatchObject({
    status: "ready",
    draft: { title: "Europe source copy" },
  });
  expect(readGuestBuildDraft(device, legacyGuestBuildKey)).toMatchObject({
    status: "ready",
    draft: { title: "Guest build" },
  });
  expect(readGuestBuildDraft(device, asia).status).toBe("empty");
  expect(readGuestBuildDraft(device, other).status).toBe("empty");
});
it("reports corrupt/invalid records without removing them and rejects invalid replacements", () => {
  const device = storage();
  for (const invalid of ["{broken", '{"title":"Incomplete"}']) {
    device.setItem("source", invalid);
    expect(readGuestBuildDraft(device, "source").status).toBe("invalid");
    expect(writeGuestBuildDraft(device, "source", { ...draft, title: "x" }).status).toBe("invalid");
    expect(device.getItem("source")).toBe(invalid);
  }
  expect(writeGuestBuildDraft(device, "source", draft).status).toBe("saved");
  expect(readGuestBuildDraft(device, "source").status).toBe("ready");
});
it("uses the same64KiB UTF8 size limit for reads and writes without truncation", () => {
  const device = storage(),
    huge = {
      ...draft,
      description: "界".repeat(4000),
      strategy: "界".repeat(12000),
      patchNotes: "界".repeat(2000),
      equipment: [
        { ...draft.equipment[0], abilities: "界".repeat(1000), alternatives: "界".repeat(1000) },
        {
          ...draft.equipment[0],
          slot: "Off hand",
          itemId: "T4_OFF_SHIELD",
          abilities: "界".repeat(1000),
          alternatives: "界".repeat(1000),
        },
      ],
    };
  expect(buildInput.safeParse(huge).success).toBe(true);
  const json = JSON.stringify(huge);
  expect(json.length).toBeLessThan(65536);
  expect(new TextEncoder().encode(json).byteLength).toBeGreaterThan(65536);
  device.setItem("source", json);
  expect(readGuestBuildDraft(device, "source").status).toBe("invalid");
  expect(writeGuestBuildDraft(device, "source", huge).status).toBe("oversized");
  expect(device.getItem("source")).toBe(json);
});
it("reports blocked writes without altering valid records", () => {
  const device = storage();
  writeGuestBuildDraft(device, "source", draft);
  const original = device.getItem("source");
  const blocked = {
    getItem: device.getItem,
    setItem: () => {
      throw new Error("Storage blocked");
    },
  };
  expect(writeGuestBuildDraft(blocked, "source", { ...draft, title: "New title" }).status).toBe(
    "unavailable",
  );
  expect(device.getItem("source")).toBe(original);
});
