import { expect, it, vi } from "vitest";
import { normalizeCombatEvents, getCombatEvents, combatHosts } from "@/lib/albion/combat-events";
import { feedFreshness, newestKillAt } from "@/lib/albion/combat-source";
import { noteNewestKill } from "@/lib/kill-board";
vi.mock("@/lib/redis", () => ({ redis: () => null, rateLimit: async () => true }));
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

it("classifies feed freshness from the newest kill and the newest kill already seen", () => {
  const now = Date.parse("2026-11-08T16:40:00Z"),
    minutes = (n: number) => now - n * 60000;
  expect(newestKillAt([{ occurredAt: "2026-11-08T16:31:07.8959397Z" }])).toBe(
    Date.parse("2026-11-08T16:31:07.895Z"),
  );
  expect(newestKillAt([])).toBeNull();
  expect(feedFreshness(minutes(5), minutes(1), now, true)).toBe("live");
  expect(feedFreshness(minutes(180), null, now, true)).toBe("delayed");
  // Deeper pages are older by nature; only an answer behind a seen kill is flagged there.
  expect(feedFreshness(minutes(180), null, now, false)).toBe("live");
  expect(feedFreshness(minutes(8 * 1440), minutes(2), now, true)).toBe("snapshot");
  expect(feedFreshness(minutes(8 * 1440), minutes(2), now, false)).toBe("snapshot");
  expect(feedFreshness(null, minutes(2), now, true)).toBe("live");
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
    const feed = await getCombatEvents("europe", 0);
    expect(feed.freshness).toBe("delayed");
    expect(Date.now() - Date.parse(feed.newestAt!)).toBeGreaterThan(179 * 60000);
  } finally {
    fetcher.mockRestore();
  }
});
it("flags a week-old copy of the feed behind kills already seen, after asking once more", async () => {
  noteNewestKill("asia", Date.now() - 2 * 60000);
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => answer(page(8 * 1440)));
  try {
    const feed = await getCombatEvents("asia", 0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(feed.freshness).toBe("snapshot");
    expect(Date.now() - Date.parse(feed.newestAt!)).toBeGreaterThan(7 * 1440 * 60000);
    expect(Date.now() - Date.parse(feed.latestSeenAt!)).toBeLessThan(3 * 60000);
  } finally {
    fetcher.mockRestore();
  }
});
it("keeps the newer answer when the second ask returns the live feed", async () => {
  noteNewestKill("asia", Date.now() - 60000);
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(answer(page(8 * 1440)))
    .mockResolvedValueOnce(answer(page(1, 900)));
  try {
    const feed = await getCombatEvents("asia", 20);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(feed.freshness).toBe("live");
    expect(feed.events[0].id).toBe(900);
  } finally {
    fetcher.mockRestore();
  }
});
it("fails honestly when the source is unreachable", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("nope", { status: 502 }));
  try {
    await expect(getCombatEvents("europe", 40)).rejects.toThrow("Combat source unavailable");
  } finally {
    fetcher.mockRestore();
  }
});
