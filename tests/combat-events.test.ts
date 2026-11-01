import { expect, it, vi } from "vitest";
import { normalizeCombatEvents, getCombatEvents, combatHosts } from "@/lib/albion/combat-events";
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
