import { describe, it, expect } from "vitest";
import { buildInput, canReadBuild } from "../src/lib/builds/validation";
const valid = {
  title: "Test build",
  description: "",
  region: "europe",
  contentType: "Solo Mists",
  visibility: "PRIVATE",
  playerCount: 1,
  recommendedIP: 1000,
  strategy: "",
  patchNotes: "",
  equipment: [
    { slot: "Main hand", itemId: "T4_MAIN_AXE", quality: 1, abilities: "", alternatives: "" },
  ],
};
describe("build boundaries", () => {
  it("accepts a complete minimal build", () =>
    expect(buildInput.safeParse(valid).success).toBe(true));
  it("requires a main hand and unique slots", () => {
    expect(buildInput.safeParse({ ...valid, equipment: [] }).success).toBe(false);
    expect(
      buildInput.safeParse({ ...valid, equipment: [...valid.equipment, ...valid.equipment] })
        .success,
    ).toBe(false);
  });
  it("validates quality and IDs", () =>
    expect(
      buildInput.safeParse({
        ...valid,
        equipment: [{ ...valid.equipment[0], quality: 6, itemId: "javascript:alert(1)" }],
      }).success,
    ).toBe(false));
  it("enforces private visibility", () => {
    expect(canReadBuild("PRIVATE", "owner", "other")).toBe(false);
    expect(canReadBuild("PRIVATE", "owner", "owner")).toBe(true);
    expect(canReadBuild("UNLISTED", "owner")).toBe(true);
  });
});
