import { beforeEach, describe, expect, it, vi } from "vitest";
import { deadlineError, drawWinners, giveawayAction, maxWinners } from "../src/lib/giveaways/rules";
import { phaseOf } from "../src/lib/giveaways/display";
import { HttpError } from "../src/lib/http-error";

/* ------------------------------------------------------------------------------------------ */
/* A small in-memory stand-in for the Prisma calls the giveaway service makes, so the service's */
/* own rules (rights, deadline, draw once, members only) run exactly as written.               */
/* ------------------------------------------------------------------------------------------ */
type Row = Record<string, unknown>;
const store = vi.hoisted(() => ({
  users: [] as Row[],
  members: [] as Row[],
  giveaways: [] as Row[],
  entries: [] as Row[],
}));
function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, test]) => {
    const value = row[key];
    if (test && typeof test === "object" && !(test instanceof Date)) {
      const t = test as Row;
      if ("in" in t) return (t.in as unknown[]).includes(value);
      if ("not" in t) return value !== t.not;
    }
    return value === test;
  });
}
const pick = (row: Row, select?: Row) =>
  select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : { ...row };
const userOf = (id: unknown) => store.users.find((u) => u.id === id) ?? {};
const tx = {
  user: {
    findUnique: async ({ where }: { where: Row }) => store.users.find((u) => u.id === where.id),
  },
  groupMember: {
    findUnique: async ({ where }: { where: { groupId_userId: Row } }) => {
      const m = store.members.find((r) => matches(r, where.groupId_userId));
      return m
        ? { group: { ownerId: m.ownerId }, roles: (m.roles as Row[]).map((role) => ({ role })) }
        : null;
    },
    findMany: async ({ where }: { where: Row }) =>
      store.members.filter((r) => matches(r, where)).map((r) => ({ userId: r.userId })),
  },
  giveaway: {
    findMany: async ({ where }: { where: Row }) =>
      store.giveaways
        .filter((g) => matches(g, where))
        .map((g) => ({ ...g, drawnBy: g.drawnById ? { name: userOf(g.drawnById).name } : null })),
    findFirst: async ({ where }: { where: Row }) => store.giveaways.find((g) => matches(g, where)),
    count: async ({ where }: { where: Row }) =>
      store.giveaways.filter((g) => matches(g, where)).length,
    create: async ({ data }: { data: Row }) => {
      const row = {
        id: `g${store.giveaways.length + 1}`,
        status: "OPEN",
        version: 1,
        drawnAt: null,
        drawnById: null,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      store.giveaways.push(row);
      return row;
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = store.giveaways.filter((g) => matches(g, where));
      for (const g of rows)
        for (const [k, v] of Object.entries(data))
          g[k] = k === "version" ? (g.version as number) + 1 : v;
      return { count: rows.length };
    },
  },
  giveawayEntry: {
    findUnique: async ({ where }: { where: { giveawayId_userId: Row } }) =>
      store.entries.find((e) => matches(e, where.giveawayId_userId)) ?? null,
    findMany: async ({ where, select }: { where: Row; select?: Row }) =>
      store.entries
        .filter((e) => matches(e, where))
        .sort((a, b) => Number(a.winnerPosition ?? 0) - Number(b.winnerPosition ?? 0))
        .map((e) => ({ ...pick(e, select), user: userOf(e.userId) })),
    groupBy: async ({ where }: { where: Row }) => {
      const counts = new Map<unknown, number>();
      for (const e of store.entries.filter((r) => matches(r, where)))
        counts.set(e.giveawayId, (counts.get(e.giveawayId) ?? 0) + 1);
      return [...counts].map(([giveawayId, n]) => ({ giveawayId, _count: { _all: n } }));
    },
    create: async ({ data }: { data: Row }) => {
      if (store.entries.some((e) => e.giveawayId === data.giveawayId && e.userId === data.userId))
        throw new Error("unique");
      store.entries.push({ winnerPosition: null, createdAt: new Date(), ...data });
    },
    deleteMany: async ({ where }: { where: Row }) => {
      store.entries = store.entries.filter((e) => !matches(e, where));
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = store.entries.filter((e) => matches(e, where));
      rows.forEach((e) => Object.assign(e, data));
      return { count: rows.length };
    },
  },
};
vi.mock("../src/lib/db", () => ({
  databaseService: () => undefined,
  db: { $transaction: (work: (client: unknown) => Promise<unknown>) => work(tx) },
}));
const { changeGiveaway, giveawayBoard } = await import("../src/lib/giveaways/service");

const soon = () => new Date(Date.now() + 3_600_000).toISOString();
const draft = {
  action: "create",
  title: "Weekend mount giveaway",
  prize: "One T8 Swiftclaw each",
  region: "europe",
  winnerCount: 2,
  closesAt: soon(),
};
const close = (id: string) => {
  // Entries close: the deadline passes.
  store.giveaways.find((g) => g.id === id)!.closesAt = new Date(Date.now() - 1000);
};
const denied = async (work: Promise<unknown>, status: number) => {
  const error = await work.then(
    () => null,
    (e) => e,
  );
  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).status).toBe(status);
};

beforeEach(() => {
  store.users = [
    { id: "staff", name: "Staff", role: "ADMIN" },
    ...["a", "b", "c", "d", "e"].map((id) => ({ id, name: `Player ${id}`, role: "USER" })),
  ];
  store.members = [];
  store.giveaways = [];
  store.entries = [];
});

describe("drawing winners", () => {
  it("draws k different winners and never more than entered", () => {
    const pool = Array.from({ length: 30 }, (_, i) => `p${i}`);
    for (let run = 0; run < 200; run++) {
      const winners = drawWinners(pool, 7);
      expect(winners).toHaveLength(7);
      expect(new Set(winners).size).toBe(7);
      winners.forEach((w) => expect(pool).toContain(w));
    }
    expect(drawWinners(["a", "b"], 5).sort()).toEqual(["a", "b"]);
    expect(drawWinners([], 3)).toEqual([]);
  });

  it("gives every entrant the same chance of each place (crypto randomness)", () => {
    const pool = ["a", "b", "c", "d", "e"];
    const trials = 50_000;
    const first = new Map(pool.map((p) => [p, 0]));
    const anywhere = new Map(pool.map((p) => [p, 0]));
    for (let i = 0; i < trials; i++) {
      const winners = drawWinners(pool, 2);
      first.set(winners[0], first.get(winners[0])! + 1);
      winners.forEach((w) => anywhere.set(w, anywhere.get(w)! + 1));
    }
    // Chi-square against uniform, 4 degrees of freedom: 18.47 is the 0.1% critical value.
    const chi = (counts: Map<string, number>, expected: number) =>
      [...counts.values()].reduce((sum, n) => sum + (n - expected) ** 2 / expected, 0);
    expect(chi(first, trials / 5)).toBeLessThan(18.47);
    expect(chi(anywhere, (trials * 2) / 5)).toBeLessThan(18.47);
  });

  it("is a partial Fisher-Yates shuffle over the given order and refuses an out-of-range pick", () => {
    // Always swapping in the last entrant: d, then a (now last), then b.
    expect(drawWinners(["a", "b", "c", "d"], 3, (_min, max) => max)).toEqual(["d", "a", "b"]);
    // Always taking the first remaining keeps the order.
    expect(drawWinners(["a", "b", "c"], 2, (min) => min)).toEqual(["a", "b"]);
    expect(() => drawWinners(["a", "b"], 1, () => 5)).toThrow("Draw out of range");
  });
});

describe("giveaway requests", () => {
  it("are strict: nobody can send a winner, a status, a team or a draw time", () => {
    expect(giveawayAction.safeParse(draft).success).toBe(true);
    for (const extra of [
      { winners: ["a"] },
      { status: "DRAWN" },
      { groupId: "team" },
      { drawnAt: soon() },
    ])
      expect(giveawayAction.safeParse({ ...draft, ...extra }).success).toBe(false);
    expect(giveawayAction.safeParse({ action: "draw", id: "g1", winners: ["a"] }).success).toBe(
      false,
    );
  });
  it("bound the title, prize, winners, picture and deadline", () => {
    const bad = [
      { title: "ab" },
      { prize: "" },
      { winnerCount: 0 },
      { winnerCount: maxWinners + 1 },
      { winnerCount: 1.5 },
      { image: "../../etc" },
      { region: "mars" },
      { closesAt: "tomorrow" },
    ];
    for (const change of bad)
      expect(
        giveawayAction.safeParse({ ...draft, ...change }).success,
        JSON.stringify(change),
      ).toBe(false);
    expect(giveawayAction.parse({ ...draft, image: "trophy-gold" })).toMatchObject({
      image: "trophy-gold",
    });
    const now = Date.parse("2026-11-08T12:00:00Z");
    expect(deadlineError("2026-11-08T12:01:00Z", now)).toMatch(/five minutes/);
    expect(deadlineError("2027-12-01T00:00:00Z", now)).toMatch(/six months/);
    expect(deadlineError("2026-11-09T12:00:00Z", now)).toBeNull();
  });
  it("says where a giveaway stands", () => {
    const now = Date.parse("2026-11-08T12:00:00Z");
    expect(phaseOf({ status: "OPEN", closesAt: "2026-11-08T13:00:00Z" }, now)).toBe("open");
    expect(phaseOf({ status: "OPEN", closesAt: "2026-11-08T11:00:00Z" }, now)).toBe("closed");
    expect(phaseOf({ status: "DRAWN", closesAt: "2026-11-08T11:00:00Z" }, now)).toBe("drawn");
    expect(phaseOf({ status: "CANCELLED", closesAt: "2026-11-08T13:00:00Z" }, now)).toBe(
      "cancelled",
    );
  });
});

describe("the giveaway service", () => {
  it("lets only staff run a site-wide giveaway and players enter once", async () => {
    await denied(changeGiveaway(null, "a", draft), 403);
    expect(store.giveaways).toHaveLength(0);
    const { board } = await changeGiveaway(null, "staff", draft);
    const id = board.giveaways[0].id;
    await changeGiveaway(null, "a", { action: "enter", id });
    await denied(changeGiveaway(null, "a", { action: "enter", id }), 409);
    expect(store.entries).toHaveLength(1);
    await denied(changeGiveaway(null, "a", { action: "draw", id }), 403);
    await denied(changeGiveaway(null, "staff", { action: "draw", id }), 409);
    const view = await giveawayBoard(null, "a");
    expect(view.giveaways[0]).toMatchObject({ entries: 1, entered: true, winners: [] });
  });

  it("draws once after entries close; a second draw returns the same winners", async () => {
    const { board } = await changeGiveaway(null, "staff", draft);
    const id = board.giveaways[0].id;
    for (const player of ["a", "b", "c", "d"])
      await changeGiveaway(null, player, { action: "enter", id });
    close(id);
    await denied(changeGiveaway(null, "e", { action: "enter", id }), 409);
    await denied(changeGiveaway(null, "a", { action: "leave", id }), 409);
    const first = await changeGiveaway(null, "staff", { action: "draw", id });
    const winners = first.board.giveaways[0].winners;
    expect(winners.map((w) => w.place)).toEqual([1, 2]);
    expect(new Set(winners.map((w) => w.name)).size).toBe(2);
    const giveaway = store.giveaways[0];
    expect(giveaway).toMatchObject({ status: "DRAWN", drawnById: "staff" });
    expect(giveaway.drawnAt).toBeInstanceOf(Date);
    const again = await changeGiveaway(null, "staff", { action: "draw", id });
    expect(again).toMatchObject({ alreadyDrawn: true });
    expect(again.board.giveaways[0].winners).toEqual(winners);
    expect(store.entries.filter((e) => e.winnerPosition !== null)).toHaveLength(2);
    // After the draw nothing about it changes.
    await denied(changeGiveaway(null, "staff", { action: "cancel", id }), 409);
    await denied(
      changeGiveaway(null, "staff", { ...draft, action: "update", id, version: 2 }),
      409,
    );
  });

  it("keeps a team's giveaway to its members and drops anyone who left before the draw", async () => {
    const manage = 1 << 10; // Manage giveaways
    store.members = [
      { groupId: "t", userId: "a", ownerId: "a", roles: [] },
      { groupId: "t", userId: "b", ownerId: "a", roles: [{ position: 1, permissions: 0 }] },
      { groupId: "t", userId: "c", ownerId: "a", roles: [{ position: 2, permissions: manage }] },
    ];
    await denied(giveawayBoard("t", "d"), 404);
    await denied(changeGiveaway("t", "d", draft), 404);
    await denied(changeGiveaway("t", "b", draft), 403);
    const { board } = await changeGiveaway("t", "c", { ...draft, winnerCount: 3 });
    const id = board.giveaways[0].id;
    // The team's giveaway is not reachable as a site-wide one, nor the other way round.
    await denied(changeGiveaway(null, "a", { action: "enter", id }), 404);
    for (const player of ["a", "b", "c"])
      await changeGiveaway("t", player, { action: "enter", id });
    await denied(changeGiveaway("t", "d", { action: "enter", id }), 404);
    store.members = store.members.filter((m) => m.userId !== "b");
    close(id);
    await denied(changeGiveaway("t", "a", { action: "draw", id: "missing" }), 404);
    await denied(changeGiveaway("t", "b", { action: "draw", id }), 404);
    const drawn = await changeGiveaway("t", "a", { action: "draw", id });
    expect(drawn.board.giveaways[0].winners.map((w) => w.name).sort()).toEqual([
      "Player a",
      "Player c",
    ]);
    expect(store.entries.find((e) => e.userId === "b")?.winnerPosition).toBeNull();
  });
});
