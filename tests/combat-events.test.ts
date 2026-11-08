import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { normalizeCombatEvents, getCombatEvents, combatHosts } from "@/lib/albion/combat-events";
import {
  feedEventsFrom,
  feedFreshness,
  mergeFeedEvents,
  mergeRecent,
  newestKillAt,
  readCombatJson,
  shouldRetry,
  type RecentKills,
} from "@/lib/albion/combat-source";
vi.mock("@/lib/redis", () => ({ redis: () => null, rateLimit: async () => true }));
// The collector's window of newest fights, as each test sets it.
const board = vi.hoisted(() => ({
  recent: { events: [], readAt: null, newestAt: null } as unknown as RecentKills,
}));
vi.mock("@/lib/kill-board", () => ({
  killShortlist: async () => ({ kills: [], collectedAt: null }),
  recentKills: async () => board.recent,
}));
// Each test starts two minutes after the last, so the feed's 45-second page cache never carries
// one test's answer into the next.
let clock = Date.now();
beforeEach(() => {
  board.recent = { events: [], readAt: null, newestAt: null };
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime((clock += 120_000));
});
afterEach(() => vi.useRealTimers());
const source = (id = 10) => ({
  EventId: id,
  TimeStamp: "2026-10-29T01:02:03.123Z",
  Killer: {
    Id: "killer",
    Name: "Combat test killer",
    GuildName: "Test team",
    Equipment: {
      MainHand: { Type: "T4_MAIN_AXE", Quality: 3, Count: 1 },
      Potion: { Type: "T6_POTION_HEAL", Quality: 0 },
    },
    Inventory: [{ secret: "Irrelevant payload" }],
  },
  Victim: { Id: "victim", Name: "Combat test victim", AverageItemPower: 987.5 },
  TotalVictimKillFame: 12345,
  numberOfParticipants: 2,
  Participants: Array(100).fill({ unnecessary: true }),
});
it("projects real source identities and ten recorded slots without private/unneeded source baggage", () => {
  const row = normalizeCombatEvents([source()])[0];
  expect(row).toMatchObject({
    id: 10,
    fame: 12345,
    participants: 2,
    killer: { id: "killer", name: "Combat test killer", guild: "Test team", itemPower: null },
    victim: { itemPower: 987.5 },
  });
  expect(row.killer.equipment).toHaveLength(10);
  expect(row.killer.equipment.find((item) => item.slot === "Main hand")).toEqual({
    slot: "Main hand",
    itemId: "T4_MAIN_AXE",
    quality: 3,
  });
  expect(row.killer.equipment.find((item) => item.slot === "Potion")?.quality).toBeNull();
  expect(row.killer.equipment.find((item) => item.slot === "Helmet")).toEqual({
    slot: "Helmet",
    itemId: null,
    quality: null,
  });
  expect(JSON.stringify(row)).not.toContain("unnecessary");
  expect(JSON.stringify(row)).not.toContain("Irrelevant");
  expect(row.occurredAt).toBe("2026-10-29T01:02:03.123Z");
});
it("deduplicates event identities while rejecting oversized, unsafe or malformed upstream facts", () => {
  expect(normalizeCombatEvents([source(), source(), source(11)])).toHaveLength(2);
  for (const invalid of [
    [...Array(21)].map((_, i) => source(i + 1)),
    [{ ...source(), TimeStamp: "missing" }],
    [{ ...source(), TotalVictimKillFame: Number.MAX_SAFE_INTEGER + 1 }],
    [
      {
        ...source(),
        Killer: { ...source().Killer, Equipment: { MainHand: { Type: "https://evil.test/path" } } },
      },
    ],
  ])
    expect(() => normalizeCombatEvents(invalid)).toThrow();
});
it("validates region and bounded page before any external request", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch");
  try {
    await expect(getCombatEvents("other" as never, 0)).rejects.toThrow();
    for (const offset of [-1, 1, 201, Infinity])
      await expect(getCombatEvents("europe", offset)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    fetcher.mockRestore();
  }
});
it("uses a fixed regional host, short public cache and stripped source payload", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify([source()]), { headers: { "Content-Type": "application/json" } }),
    );
  try {
    const first = await getCombatEvents("europe", 200),
      second = await getCombatEvents("europe", 200);
    expect(first).toEqual(second);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe(
      `${combatHosts.europe}/api/gameinfo/events?limit=20&offset=200`,
    );
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: "manual", cache: "no-store" });
    expect(first.region).toBe("europe");
  } finally {
    fetcher.mockRestore();
  }
});

const page = (minutesAgo: number, id = 500) =>
  JSON.stringify(
    [0, 1].map((i) => ({
      ...source(id + i),
      TimeStamp: new Date(Date.now() - minutesAgo * 60000 - i * 1000).toISOString(),
    })),
  );
const answer = (body: string) =>
  new Response(body, { headers: { "Content-Type": "application/json" } });

const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
/** Window events from the same fixture, normalized as the collector stores them. */
const windowOf = (minutes: number[], firstId = 1000) =>
  feedEventsFrom(
    minutes.map((m, i) => ({ ...source(firstId + i), TimeStamp: ago(m), Participants: [] })),
    200,
  );

it("classifies feed freshness from the newest kill and the newest kill already seen", () => {
  const now = Date.parse("2026-11-08T16:40:00Z"),
    minutes = (n: number) => now - n * 60000;
  expect(newestKillAt([{ occurredAt: "2026-11-08T16:31:07.8959397Z" }])).toBe(
    Date.parse("2026-11-08T16:31:07.895Z"),
  );
  expect(newestKillAt([])).toBeNull();
  expect(feedFreshness(minutes(5), minutes(1), now, true)).toBe("live");
  // Within 15 minutes of the newest kill Outpost saw is live; past it, an old copy.
  expect(feedFreshness(minutes(16), minutes(2), now, true)).toBe("live");
  expect(feedFreshness(minutes(31), minutes(2), now, true)).toBe("snapshot");
  // 8 Nov 2026, Asia: newest 19:49 against 20:20 seen was labelled live; it is an old copy.
  expect(
    feedFreshness(
      Date.parse("2026-11-08T19:49:00Z"),
      Date.parse("2026-11-08T20:20:00Z"),
      Date.parse("2026-11-08T20:27:00Z"),
      true,
    ),
  ).toBe("snapshot");
  expect(feedFreshness(minutes(180), null, now, true)).toBe("delayed");
  expect(feedFreshness(minutes(180), minutes(178), now, true)).toBe("delayed");
  // Deeper pages are older by nature; only an answer an hour behind a seen kill is flagged.
  expect(feedFreshness(minutes(180), null, now, false)).toBe("live");
  expect(feedFreshness(minutes(31), minutes(2), now, false)).toBe("live");
  expect(feedFreshness(minutes(8 * 1440), minutes(2), now, true)).toBe("snapshot");
  expect(feedFreshness(minutes(8 * 1440), minutes(2), now, false)).toBe("snapshot");
  expect(feedFreshness(null, minutes(2), now, true)).toBe("live");
});
it("asks again when an answer is more than five minutes behind the newest kill seen", () => {
  const now = Date.now(),
    minutes = (n: number) => now - n * 60000;
  expect(shouldRetry(minutes(4), minutes(0))).toBe(false);
  expect(shouldRetry(minutes(6), minutes(0))).toBe(true);
  // 8 Nov 2026, Europe: 19:56 against a 20:21 already seen.
  expect(shouldRetry(Date.parse("2026-11-08T19:56:00Z"), Date.parse("2026-11-08T20:21:00Z"))).toBe(
    true,
  );
  expect(shouldRetry(minutes(60), null)).toBe(false);
  expect(shouldRetry(null, minutes(1))).toBe(true);
});
it("merges answers by EventId, newest first, each fight keeping its own time", () => {
  const e = (id: number, occurredAt: string) => ({ id, occurredAt });
  const stale = [e(1, "2026-11-08T19:56:00Z"), e(2, "2026-11-08T19:55:00Z")];
  const fresh = [e(3, "2026-11-08T20:21:00Z"), e(1, "2026-11-08T19:56:00Z")];
  expect(mergeFeedEvents(stale, fresh, 20)).toEqual([
    e(3, "2026-11-08T20:21:00Z"),
    e(1, "2026-11-08T19:56:00Z"),
    e(2, "2026-11-08T19:55:00Z"),
  ]);
  expect(mergeFeedEvents(stale, fresh, 2).map((x) => x.id)).toEqual([3, 1]);
  // Same second: the higher event id first, so every merge orders a fight the same way.
  expect(
    mergeFeedEvents([e(5, "2026-11-08T20:00:00Z")], [e(9, "2026-11-08T20:00:00Z")], 2).map(
      (x) => x.id,
    ),
  ).toEqual([9, 5]);
});
it("keeps a rolling window of the newest distinct fights across collector reads", () => {
  const now = Date.now();
  const first = windowOf([1, 2, 3], 1);
  // A lagging replica answers with older fights and one already held: nothing newer drops out.
  const lagging = windowOf([30, 2], 10).map((ev, i) => (i === 1 ? first[1] : ev));
  const merged = mergeRecent(first, lagging, now);
  expect(merged.map((ev) => ev.id)).toEqual([1, 2, 3, 10]);
  // A newer read pushes the oldest out at the size bound.
  const newer = windowOf([0.5], 20);
  expect(mergeRecent(merged, newer, now, 4).map((ev) => ev.id)).toEqual([20, 1, 2, 3]);
  // Fights dated well ahead of now are left out; the serialized window stays under its bound.
  const ahead = windowOf([-10], 30);
  expect(mergeRecent(merged, ahead, now).map((ev) => ev.id)).not.toContain(30);
  const bounded = mergeRecent([], windowOf([1, 2, 3, 4, 5], 40), now, 100, 3000);
  expect(JSON.stringify(bounded).length).toBeLessThanOrEqual(3000);
  expect(bounded.map((ev) => ev.id)).toEqual([40, 41, 42, 43, 44].slice(0, bounded.length));
});
it("keeps a fight whose participants do not parse, without claiming it had none", () => {
  const [kept] = feedEventsFrom([source(7)]);
  expect(kept.id).toBe(7);
  expect(kept.crew).toBeUndefined();
  expect(kept.inventory).toBeUndefined();
  const [full] = feedEventsFrom([
    {
      ...source(8),
      Victim: { ...source().Victim, Inventory: [null, { Type: "T4_BAG", Count: 1 }] },
      Participants: [{ Id: "p", Name: "Helper", DamageDone: 10.4 }],
    },
  ]);
  expect(full.inventory).toEqual([{ itemId: "T4_BAG", count: 1 }]);
  expect(full.crew).toMatchObject([{ name: "Helper", damage: 10 }]);
  expect(feedEventsFrom([{ nope: true }, source(9), source(9)]).map((ev) => ev.id)).toEqual([9]);
  expect(() => feedEventsFrom({ not: "a list" })).toThrow();
});
it("reads pages beyond one megabyte, which large fights produce, up to the cap", async () => {
  const big = JSON.stringify([{ ...source(1), padding: "x".repeat(2_500_000) }]);
  const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => answer(big));
  try {
    expect(((await readCombatJson("https://x.test")) as unknown[]).length).toBe(1);
    await expect(readCombatJson("https://x.test", { maxBytes: 1_000_000 })).rejects.toThrow(
      "Combat response exceeds limit",
    );
  } finally {
    fetcher.mockRestore();
  }
});
it("serves the first page from the collector's window without asking the source", async () => {
  board.recent = {
    events: windowOf([...Array(30)].map((_, i) => 1 + i)),
    readAt: new Date(Date.now() - 30_000).toISOString(),
    newestAt: Date.now() - 60_000,
  };
  // Offline: page 1 never asks the source, and page 2 (thinner than the window) falls back to
  // the window when the top-up read fails, whatever network the test runner has.
  const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  try {
    const feed = await getCombatEvents("europe", 0);
    expect(fetcher).not.toHaveBeenCalled();
    expect(feed.origin).toBe("collector");
    expect(feed.events).toHaveLength(20);
    expect(feed.events[0].id).toBe(1000);
    expect(feed.freshness).toBe("live");
    expect(feed.collectedAt).toBe(board.recent.readAt);
    const second = await getCombatEvents("europe", 20);
    expect(second.events.map((ev) => ev.id)).toEqual([...Array(10)].map((_, i) => 1020 + i));
  } finally {
    fetcher.mockRestore();
  }
});
it("tops a thin window up with a live read and merges both by EventId", async () => {
  board.recent = {
    events: windowOf([2, 9]),
    readAt: new Date().toISOString(),
    newestAt: Date.now() - 2 * 60000,
  };
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(answer(page(1, 500)));
  try {
    const feed = await getCombatEvents("americas", 0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(feed.origin).toBe("source");
    expect(feed.events.map((ev) => ev.id)).toEqual([500, 501, 1000, 1001]);
    expect(feed.freshness).toBe("live");
  } finally {
    fetcher.mockRestore();
  }
});
it("asks a lagging replica once more and merges the newer answer in", async () => {
  // 8 Nov 2026, Europe: one answer's newest kill 25 minutes behind the next one's.
  board.recent = { events: [], readAt: null, newestAt: Date.now() - 6 * 60000 };
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(answer(page(31, 600)))
    .mockResolvedValueOnce(answer(page(6, 700)));
  try {
    const feed = await getCombatEvents("europe", 0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(feed.events.map((ev) => ev.id)).toEqual([700, 701, 600, 601]);
    expect(feed.freshness).toBe("live");
  } finally {
    fetcher.mockRestore();
  }
});
it("dates a fresh first page and marks it live", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(answer(page(3)));
  try {
    const feed = await getCombatEvents("americas", 0);
    expect(feed.freshness).toBe("live");
    expect(Date.now() - Date.parse(feed.newestAt!)).toBeLessThan(4 * 60000);
    expect(feed.latestSeenAt).toBe(feed.newestAt);
    expect(fetcher).toHaveBeenCalledTimes(1);
  } finally {
    fetcher.mockRestore();
  }
});
it("says the source is behind when its newest kill is hours old", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(answer(page(180)));
  try {
    const feed = await getCombatEvents("asia", 0);
    expect(feed.freshness).toBe("delayed");
    expect(Date.now() - Date.parse(feed.newestAt!)).toBeGreaterThan(179 * 60000);
  } finally {
    fetcher.mockRestore();
  }
});
it("flags an old copy of the feed behind kills already seen, after asking once more", async () => {
  board.recent = { events: [], readAt: null, newestAt: Date.now() - 2 * 60000 };
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => answer(page(40, 800)));
  try {
    const feed = await getCombatEvents("asia", 0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(feed.freshness).toBe("snapshot");
    expect(Date.now() - Date.parse(feed.latestSeenAt!)).toBeLessThan(3 * 60000);
  } finally {
    fetcher.mockRestore();
  }
});
it("serves the collector's copy, said as such, when the live read fails", async () => {
  board.recent = {
    events: windowOf([12, 13]),
    readAt: new Date(Date.now() - 10 * 60000).toISOString(),
    newestAt: Date.now() - 12 * 60000,
  };
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("nope", { status: 502 }));
  try {
    const feed = await getCombatEvents("americas", 0);
    expect(feed.sourceUnavailable).toBe(true);
    expect(feed.origin).toBe("collector");
    expect(feed.events.map((ev) => ev.id)).toEqual([1000, 1001]);
    expect(feed.events[0].occurredAt).toBe(board.recent.events[0].occurredAt);
  } finally {
    fetcher.mockRestore();
  }
});
it("fails honestly when the source is unreachable and the collector has nothing", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("nope", { status: 502 }));
  try {
    await expect(getCombatEvents("europe", 40)).rejects.toThrow("Combat source unavailable");
  } finally {
    fetcher.mockRestore();
  }
});
