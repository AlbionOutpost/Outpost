import { describe, expect, it } from "vitest";
import {
  KILL_WINDOW_MS,
  SHORTLIST_SIZE,
  candidatesFrom,
  collectKillFeeds,
  combatHosts,
  fetchKillCandidates,
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

  it("stores the stripped record, not the source's group members and spells", () => {
    const [kill] = candidatesFrom([{ ...ranked(1, 100, 1000), GroupMembers: [{ Id: "g" }] }]);
    expect(JSON.stringify(kill.raw)).not.toContain("GroupMembers");
  });

  it("collects the two newest feed pages into the window and every page into the shortlist", async () => {
    const urls: string[] = [];
    const { candidates, recent } = await fetchKillCandidates("americas", async (url) => {
      urls.push(url);
      if (url.includes("offset=51")) throw new Error("Combat response exceeds limit");
      return url.includes("killfame") ? [ranked(9, 900, 86_400_000)] : [ranked(1, 100, 60_000)];
    });
    expect(urls).toEqual([
      `${combatHosts.americas}/api/gameinfo/events?limit=51&offset=0`,
      `${combatHosts.americas}/api/gameinfo/events?limit=51&offset=51`,
      `${combatHosts.americas}/api/gameinfo/events/killfame?range=week&limit=10&offset=0`,
    ]);
    // A failed page is missing from this pass only; the ranking never enters the newest window.
    expect(candidates.map((k) => k.id)).toEqual([1, 9]);
    expect(recent.map((e) => e.id)).toEqual([1]);
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
  const now = Date.parse("2026-11-05T12:00:00Z");
  const recent = "2026-11-04T12:00:00";
  const kill = (id: string, items: [string, number][]) => ({
    fame: 1,
    victim: {
      equipment: items.map(([slot], i) => ({ slot, itemId: `ID${id}_${i}`, quality: 1 })),
    },
    marker: id,
  });
  it("orders by priced gear value, highest first, and reports missing pieces", () => {
    const a = kill("A", [["Main hand", 1]]);
    const b = kill("B", [["Main hand", 1]]);
    const prices = [
      {
        item_id: "IDA_0",
        quality: 1,
        city: "Martlock",
        sell_price_min: 1000,
        sell_price_min_date: recent,
      },
      {
        item_id: "IDB_0",
        quality: 1,
        city: "Martlock",
        sell_price_min: 5000,
        sell_price_min_date: recent,
      },
    ] as never[];
    const ranked = rankByGearValue([a, b], prices, ["Martlock"], now);
    expect(ranked.map((k) => k.marker)).toEqual(["B", "A"]);
    expect(ranked[0].gearValue).toEqual({ total: 5000, priced: 1, missing: 0 });
  });
  it("ignores non-royal cities and counts unpriced pieces", () => {
    const a = kill("A", [
      ["Main hand", 1],
      ["Chest", 1],
    ]);
    const prices = [
      {
        item_id: "IDA_0",
        quality: 1,
        city: "Caerleon",
        sell_price_min: 9000,
        sell_price_min_date: recent,
      }, // not in list
    ] as never[];
    const ranked = rankByGearValue([a], prices, ["Martlock"], now);
    expect(ranked[0].gearValue).toBeNull();
  });
  it("treats listings older than the kill window, or undated, as missing", () => {
    const a = kill("A", [
      ["Main hand", 1],
      ["Chest", 1],
    ]);
    const prices = [
      {
        item_id: "IDA_0",
        quality: 1,
        city: "Martlock",
        sell_price_min: 100,
        sell_price_min_date: "2026-06-01T00:00:00",
      },
      {
        item_id: "IDA_0",
        quality: 1,
        city: "Martlock",
        sell_price_min: 400,
        sell_price_min_date: recent,
      },
      {
        item_id: "IDA_1",
        quality: 1,
        city: "Martlock",
        sell_price_min: 50,
        sell_price_min_date: "0001-01-01T00:00:00",
      },
    ] as never[];
    const ranked = rankByGearValue([a], prices, ["Martlock"], now);
    expect(ranked[0].gearValue).toEqual({ total: 400, priced: 1, missing: 1 });
  });
});

describe("cron pass", () => {
  const kill = { id: 1, occurredAt: Date.now(), fame: 10, raw: {} };
  const event = { id: 1 } as never;

  it("records every server and succeeds when each live feed answered", async () => {
    const recorded: string[] = [];
    await collectKillFeeds(
      ["europe", "americas", "asia"],
      async (region) => recorded.push(region),
      async () => ({ candidates: [kill], recent: [event] }),
    );
    expect(recorded).toEqual(["europe", "americas", "asia"]);
  });

  it("still records the healthy servers, then fails naming the stale or failing ones", async () => {
    const recorded: string[] = [];
    const run = collectKillFeeds(
      ["europe", "americas", "asia"],
      async (region) => {
        if (region === "asia") throw new Error("write failed");
        recorded.push(region);
      },
      async (region) =>
        region === "americas"
          ? { candidates: [kill], recent: [] } // only the weekly ranking answered
          : { candidates: [kill], recent: [event] },
    );
    await expect(run).rejects.toThrow("Kill collector: no fresh kills from americas, asia");
    expect(recorded).toEqual(["europe", "americas"]);
  });
});
