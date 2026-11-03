import { describe, expect, it } from "vitest";
import { activityBackgroundFor, activityBackgrounds } from "../src/lib/activity-backgrounds";

describe("category artwork", () => {
  it("resolves every recorded category by ID and display name", () => {
    for (const artwork of activityBackgrounds) {
      expect(activityBackgroundFor(artwork.id)?.src).toBe(artwork.src);
      expect(activityBackgroundFor(artwork.name)?.src).toBe(artwork.src);
    }
  });
  it("maps unambiguous editor labels without inferring party sizes", () => {
    expect(activityBackgroundFor("Solo PvE")?.id).toBe("FAME_FARM_SOLO");
    expect(activityBackgroundFor("Group PvE")?.id).toBe("FAME_FARM_GROUP");
    expect(activityBackgroundFor("Small Scale PvP")?.id).toBe("SMALL_SCALE");
    expect(activityBackgroundFor("Roaming")?.id).toBe("OPEN_WORLD");
    expect(activityBackgroundFor("Unmapped category")).toBeUndefined();
    expect(activityBackgroundFor("Hellgates")).toBeUndefined();
    expect(activityBackgroundFor("Ganking")).toBeUndefined();
  });
});
