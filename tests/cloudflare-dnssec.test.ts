import { describe, it, expect } from "vitest";
import { normalizeDs } from "../scripts/cloudflare-dnssec.mjs";
describe("DNSSEC parent record comparison", () => {
  it("compares API zone-file DS with resolver RDATA without losing algorithm/digest identity", () => {
    expect(normalizeDs("albionoutpost.com. 3600 IN DS 2371 13 2 aabbcc")).toBe(
      normalizeDs("2371  13 2 AABBCC"),
    );
    expect(normalizeDs("2371 13 2 AABBCC")).not.toBe(normalizeDs("2371 13 4 AABBCC"));
    expect(normalizeDs(undefined)).toBe("");
    expect(normalizeDs("malformed")).toBe("");
  });
});
