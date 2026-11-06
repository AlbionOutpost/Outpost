import { describe, expect, it } from "vitest";
import { itemLabel } from "../src/lib/albion/item-label";

describe("itemLabel", () => {
  it("keeps the name from the game-data lookup", () => {
    expect(
      itemLabel("T4_CLOTH_LEVEL1@1", { "T4_CLOTH_LEVEL1@1": "Uncommon Fine Cloth (T4.1)" }),
    ).toBe("Uncommon Fine Cloth (T4.1)");
  });
  it("never shows a raw enchanted ID while the lookup has nothing", () => {
    expect(itemLabel("T4_CLOTH_LEVEL1@1")).toBe("Cloth · T4.1");
    expect(itemLabel("T4_METALBAR_LEVEL2@2")).toBe("Metalbar · T4.2");
    expect(itemLabel("T5_PLANKS")).toBe("Planks · T5.0");
    expect(itemLabel("T4_JOURNAL_WARRIOR_FULL")).toBe("Journal warrior full · T4.0");
  });
  it("leaves IDs it can't read alone", () => {
    expect(itemLabel("UNIQUE_HIDEOUT")).toBe("UNIQUE_HIDEOUT");
  });
});
