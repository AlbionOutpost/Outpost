import { expect, it } from "vitest";
import { familyName, familyScore, matchScore } from "../src/lib/search-rank";
it("matches across spacing and apostrophes", () => {
  expect(matchScore("Battleaxe", "battle axe")).toBe(95);
  expect(matchScore("Adept's Battleaxe", "adepts battleaxe")).toBe(100);
  expect(matchScore("Great Holy Staff", "holy")).toBe(60);
  expect(matchScore("Claymore", "sword")).toBe(0);
});
it("collapses tiers and enchantments into one family", () => {
  expect(familyName("Elder's Battleaxe")).toBe("Battleaxe");
  expect(familyName("Adept's Claymore · .2")).toBe("Claymore");
  // The family name ranks an exact item above one that only contains the word.
  expect(familyScore("Adept's Axe", "axe")).toBeGreaterThan(
    familyScore("Adept's Battleaxe", "axe"),
  );
});
