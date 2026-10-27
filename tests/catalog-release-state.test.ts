import { expect, it } from "vitest";
import { existingReleaseState } from "../src/lib/catalog/release-state";
it("accepts idempotent import only when the expected release is still active", () => {
  expect(existingReleaseState("a", "a", 181, 181)).toBe("already-active");
  expect(() => existingReleaseState("a", "b", 181, 181)).toThrow("immutable");
  expect(() => existingReleaseState("a", "a", 181, 0)).toThrow("inactive");
  expect(() => existingReleaseState("a", "a", 181, 180)).toThrow("incomplete");
});
