import { beforeEach, describe, expect, it, vi } from "vitest";

// A small in-memory stand-in for the two account-save tables, scoped exactly like the queries.
const store = vi.hoisted(() => ({
  users: new Set<string>(),
  favorites: [] as { userId: string; slug: string; createdAt: Date }[],
  levels: [] as { userId: string; specId: string; level: number }[],
}));
vi.mock("../src/lib/db", () => {
  const tx = {
    user: {
      findUnique: async ({ where }: never) =>
        store.users.has(where["id"]) ? { id: where["id"] } : null,
    },
    libraryFavorite: {
      findMany: async ({ where }: never) =>
        store.favorites
          .filter((f) => f.userId === where["userId"])
          .toSorted(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.slug.localeCompare(b.slug),
          )
          .map(({ slug }) => ({ slug })),
      findUnique: async ({ where }: never) =>
        store.favorites.find(
          (f) =>
            f.userId === where["userId_slug"]["userId"] && f.slug === where["userId_slug"]["slug"],
        ) ?? null,
      count: async ({ where }: never) =>
        store.favorites.filter((f) => f.userId === where["userId"]).length,
      create: async ({ data }: never) => {
        store.favorites.push({ ...(data as object), createdAt: new Date() } as never);
      },
      createMany: async ({ data }: never) => {
        for (const row of data as never[]) {
          if (store.favorites.some((f) => f.userId === row["userId"] && f.slug === row["slug"]))
            throw Error("duplicate favorite");
          store.favorites.push(row);
        }
      },
      deleteMany: async ({ where }: never) => {
        store.favorites = store.favorites.filter(
          (f) => !(f.userId === where["userId"] && f.slug === where["slug"]),
        );
      },
    },
    masteryLevel: {
      findMany: async ({ where }: never) =>
        store.levels
          .filter((l) => l.userId === where["userId"])
          .map(({ specId, level }) => ({ specId, level })),
      deleteMany: async ({ where }: never) => {
        store.levels = store.levels.filter((l) => l.userId !== where["userId"]);
      },
      createMany: async ({ data }: never) => {
        store.levels.push(...(data as never[]));
      },
    },
  };
  return {
    db: { $transaction: async (run: (t: typeof tx) => unknown) => run(tx) },
    databaseService: () => undefined,
  };
});
import { accountSavesRequest, favoritesToAdd, mergeMasteryLevels } from "../src/lib/account-saves";
import { accountSaves } from "../src/lib/account-saves-service";

describe("merge rules", () => {
  it("adds only device favorites the account lacks, in device order, up to the limit", () => {
    expect(favoritesToAdd(["a", "b"], ["c", "a", "d", "c"])).toEqual(["c", "d"]);
    expect(favoritesToAdd(["a"], ["b", "c", "d"], 3)).toEqual(["b", "c"]);
    expect(favoritesToAdd(["a", "b", "c"], ["d"], 3)).toEqual([]);
    expect(favoritesToAdd([], [])).toEqual([]);
  });
  it("keeps the higher level per spec, drops zeros and gives the same result twice or reversed", () => {
    const account = { axe: 40, sword: 0, bow: 100 },
      device = { axe: 25, sword: 7, mace: 0, hammer: 60 };
    const merged = { axe: 40, sword: 7, bow: 100, hammer: 60 };
    expect(mergeMasteryLevels(account, device)).toEqual(merged);
    expect(mergeMasteryLevels(device, account)).toEqual(merged);
    expect(mergeMasteryLevels(merged, device)).toEqual(merged);
  });
  it("reads spec keys named like Object members as unset, never as a broken level", () => {
    const merged = mergeMasteryLevels({ axe: 10 }, { constructor: 5, tostring: 3, axe: 20 });
    expect(merged).toEqual({ axe: 20, constructor: 5, tostring: 3 });
    expect(Object.values(merged).every(Number.isInteger)).toBe(true);
  });
  it("refuses malformed requests", () => {
    const bad = [
      { action: "favorite", slug: "Bad Slug", active: true },
      { action: "favorite", slug: "ok", active: true, userId: "someone-else" },
      { action: "levels", levels: { axe: 101 } },
      { action: "levels", levels: { axe: 1.5 } },
      { action: "levels", levels: { "Bad-Id": 3 } },
      {
        action: "levels",
        levels: Object.fromEntries(Array.from({ length: 401 }, (_, i) => [`s${i}`, 1])),
      },
      { action: "merge", favorites: Array.from({ length: 301 }, (_, i) => `b${i}`), levels: {} },
      { action: "read" },
    ];
    for (const body of bad) expect(accountSavesRequest.safeParse(body).success).toBe(false);
  });
});

describe("accountSaves service", () => {
  beforeEach(() => {
    store.users = new Set(["u1", "u2"]);
    store.favorites = [];
    store.levels = [];
  });
  it("merges a device copy once: a second merge of the same copy changes nothing", async () => {
    await accountSaves("u1", { action: "favorite", slug: "kept", active: true });
    const copy = { action: "merge" as const, favorites: ["new-one", "kept"], levels: { axe: 30 } };
    const first = await accountSaves("u1", copy);
    expect(first.favorites.toSorted()).toEqual(["kept", "new-one"]);
    expect(first.levels).toEqual({ axe: 30 });
    const second = await accountSaves("u1", copy);
    expect(second.favorites.toSorted()).toEqual(["kept", "new-one"]);
    expect(store.favorites).toHaveLength(2);
    expect(second.levels).toEqual({ axe: 30 });
  });
  it("keeps every account's saves to itself", async () => {
    await accountSaves("u1", { action: "favorite", slug: "mine", active: true });
    await accountSaves("u1", { action: "levels", levels: { axe: 50 } });
    expect(await accountSaves("u2", { action: "read" })).toEqual({ favorites: [], levels: {} });
    await accountSaves("u2", { action: "levels", levels: {} });
    await accountSaves("u2", { action: "favorite", slug: "mine", active: false });
    expect(await accountSaves("u1", { action: "read" })).toEqual({
      favorites: ["mine"],
      levels: { axe: 50 },
    });
  });
  it("refuses an account that no longer exists", async () => {
    await expect(accountSaves("gone", { action: "read" })).rejects.toMatchObject({ status: 401 });
  });
  it("stops at 100 favorites and drops zero levels", async () => {
    store.favorites = Array.from({ length: 100 }, (_, i) => ({
      userId: "u1",
      slug: `b${i}`,
      createdAt: new Date(i),
    }));
    await expect(
      accountSaves("u1", { action: "favorite", slug: "one-more", active: true }),
    ).rejects.toMatchObject({ status: 409 });
    const merged = await accountSaves("u1", { action: "merge", favorites: ["extra"], levels: {} });
    expect(merged.favorites).toHaveLength(100);
    expect(merged.skipped).toBe(1);
    expect(
      (await accountSaves("u1", { action: "levels", levels: { axe: 0, bow: 9 } })).levels,
    ).toEqual({ bow: 9 });
  });
});
