import { describe, expect, it } from "vitest";
import {
  KILL_WINDOW_MS,
  SHORTLIST_SIZE,
  candidatesFrom,
  mergeShortlist,
} from "@/lib/albion/combat-source";
import { rankByGearValue } from "@/lib/albion/kill-value";

const ranked = (id: number, fame: number, ageMs: number) => ({
  EventId: id,
  TimeStamp: new Date(Date.now() - ageMs).toISOString(),
  Killer: { Id: "k", Name: "Killer" },
  Victim: { Id: "v", Name: "Victim" },
  TotalVictimKillFame: fame,
});

describe("kill shortlist", () => {
  it("parses valid ranked events and skips malformed ones", () => {
    const got = candidatesFrom([ranked(1, 100, 1000), { nope: true }, ranked(2, 200, 2000)]);
    expect(got.map((k) => k.id).sort()).toEqual([1, 2]);
  });

  it("keeps the highest fame, drops kills older than seven days, dedupes by id", () => {
    const now = Date.now();
    const current = [
      { id: 1, occurredAt: now - 1000, fame: 500, raw: {} },
      { id: 2, occurredAt: now - KILL_WINDOW_MS - 1000, fame: 9000, raw: {} }, // too old
    ];
    const incoming = [
      { id: 1, occurredAt: now - 1000, fame: 800, raw: {} }, // same id, higher fame wins
      { id: 3, occurredAt: now - 2000, fame: 300, raw: {} },
    ];
    const merged = mergeShortlist(current, incoming, now);
    expect(merged.map((k) => k.id)).toEqual([1, 3]);
    expect(merged.find((k) => k.id === 1)!.fame).toBe(800);
  });

  it("never grows beyond the shortlist size", () => {
    const now = Date.now();
    const many = Array.from({ length: SHORTLIST_SIZE + 25 }, (_, i) => ({
      id: i,
      occurredAt: now - i * 1000,
      fame: i,
      raw: {},
    }));
    expect(mergeShortlist([], many, now)).toHaveLength(SHORTLIST_SIZE);
  });
});

describe("ranking by estimated gear value", () => {
  const kill = (id: string, items: [string, number][]) => ({
    fame: 1,
    victim: { equipment: items.map(([slot, _], i) => ({ slot, itemId: `ID${id}_${i}`, quality: 1 })) },
    marker: id,
  });
  it("orders by priced gear value, highest first, and reports missing pieces", () => {
    const a = kill("A", [["Main hand", 1]]);
    const b = kill("B", [["Main hand", 1]]);
    const prices = [
      { item_id: "IDA_0", quality: 1, city: "Martlock", sell_price_min: 1000 },
      { item_id: "IDB_0", quality: 1, city: "Martlock", sell_price_min: 5000 },
    ] as never[];
    const ranked = rankByGearValue([a, b], prices, ["Martlock"]);
    expect(ranked.map((k) => k.marker)).toEqual(["B", "A"]);
    expect(ranked[0].gearValue).toEqual({ total: 5000, priced: 1, missing: 0 });
  });
  it("ignores non-royal cities and counts unpriced pieces", () => {
    const a = kill("A", [["Main hand", 1], ["Chest", 1]]);
    const prices = [
      { item_id: "IDA_0", quality: 1, city: "Caerleon", sell_price_min: 9000 }, // not in list
    ] as never[];
    const ranked = rankByGearValue([a], prices, ["Martlock"]);
    expect(ranked[0].gearValue).toBeNull();
  });
});
