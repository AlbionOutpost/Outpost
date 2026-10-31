import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeTopKills } from "../src/lib/albion/combat-events";

// A page of the source's kill-fame ranking, captured 30 Oct 2026.
const sample = JSON.parse(readFileSync("tests/fixtures/combat-top-kills.json", "utf8"));

describe("normalizeTopKills", () => {
  it("keeps the victim's inventory and the participants with their kit", () => {
    const kills = normalizeTopKills(sample);
    expect(kills).toHaveLength(3);
    expect(kills[0].fame).toBe(21860247);
    expect(kills[0].inventory.length).toBeGreaterThan(9);
    expect(kills[0].inventory[0]).toMatchObject({ itemId: expect.any(String), count: 1 });
    expect(kills[1].crew.length).toBe(4);
    expect(kills[1].crew[0]).toMatchObject({ name: expect.any(String), damage: 0 });
    expect(kills[1].crew[0].equipment.some((e) => e.slot === "Main hand")).toBe(true);
    expect(kills[2].inventory).toHaveLength(1);
  });
  it("rejects payloads that do not match the source shape", () => {
    expect(() => normalizeTopKills([{ EventId: "x" }])).toThrow();
  });
});
