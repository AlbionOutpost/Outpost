import { describe, expect, it } from "vitest";
import {
  balancesFrom,
  flipSide,
  flipWinner,
  gameAction,
  maxSilver,
  rollShares,
  rollValue,
  rollWinner,
  uniformInt,
  walletAction,
} from "../src/lib/groups/economy";
import { can, fromMask, resolveAccess, seededRoles, toMask } from "../src/lib/groups/permissions";

const key = "op-0123456789";
/** A byte source that replays fixed 32-bit values, to drive the server draw deterministically. */
const replay = (...values: number[]) => {
  let i = 0;
  return (out: Uint32Array) => {
    out[0] = values[i++];
    return out;
  };
};

describe("team ledger", () => {
  it("derives every balance, the pot under null, from the entries alone", () => {
    const balances = balancesFrom([
      { userId: "a", amount: 1_000 },
      { userId: null, amount: 250 },
      { userId: "a", amount: -400 },
      { userId: "b", amount: 75 },
      { userId: "b", amount: -75 },
    ]);
    expect(balances.get("a")).toBe(600);
    expect(balances.get("b")).toBe(0);
    expect(balances.get(null)).toBe(250);
  });
  it("accepts whole silver up to a trillion with a reason and a key", () => {
    expect(
      walletAction.safeParse({
        action: "credit",
        key,
        target: "pot",
        amount: maxSilver,
        reason: "Tax",
      }).success,
    ).toBe(true);
    expect(walletAction.safeParse({ action: "payout", key, target: "user-1" }).success).toBe(true);
  });
  it.each([
    { action: "credit", key, target: "u", amount: 0, reason: "x" },
    { action: "credit", key, target: "u", amount: 1.5, reason: "x" },
    { action: "credit", key, target: "u", amount: -5, reason: "x" },
    { action: "credit", key, target: "u", amount: maxSilver + 1, reason: "x" },
    { action: "credit", key, target: "u", amount: 5, reason: "" },
    { action: "credit", key: "short", target: "u", amount: 5, reason: "x" },
    { action: "debit", key, target: "u", amount: 5 },
    { action: "credit", key, target: "u", amount: 5, reason: "x", balance: 1e9 },
    { action: "transfer", key, target: "u", amount: 5, reason: "x" },
  ])("rejects %j", (body) => {
    expect(walletAction.safeParse(body).success).toBe(false);
  });
});

describe("server draws", () => {
  it("rolls 1–100 and never favours low numbers (rejection sampling)", () => {
    expect(rollValue(replay(0))).toBe(1);
    expect(rollValue(replay(99))).toBe(100);
    // 2^32 is not a multiple of 100: the top 96 values would skew a modulo, so they are redrawn.
    const limit = Math.floor(2 ** 32 / 100) * 100;
    expect(rollValue(replay(limit, limit + 95, 41))).toBe(42);
    const seen = new Set(Array.from({ length: 5000 }, () => rollValue()));
    expect(Math.min(...seen)).toBe(1);
    expect(Math.max(...seen)).toBe(100);
  });
  it("lands a coin on either side", () => {
    expect(flipSide(replay(0))).toBe("heads");
    expect(flipSide(replay(1))).toBe("tails");
    const sides = new Set(Array.from({ length: 200 }, () => flipSide()));
    expect(sides).toEqual(new Set(["heads", "tails"]));
    expect(uniformInt(3, 3, replay(123456))).toBe(3);
  });
  it("names the winner from the stored outcome, never from the browser", () => {
    const duel = { headsId: "h", tailsId: "t", call: null };
    expect(flipWinner({ ...duel, outcome: "heads" })).toBe("h");
    expect(flipWinner({ ...duel, outcome: "tails" })).toBe("t");
    expect(flipWinner({ ...duel, outcome: null })).toBe(null);
    expect(flipWinner({ headsId: "c", tailsId: null, call: "tails", outcome: "tails" })).toBe("c");
    expect(flipWinner({ headsId: "c", tailsId: null, call: "tails", outcome: "heads" })).toBe(null);
  });
  it("takes no outcome, value or winner from a request", () => {
    for (const body of [
      { action: "call", key, call: "heads", outcome: "heads" },
      { action: "flip", key, headsId: "a", tailsId: "b", winnerId: "a" },
      { action: "roll", rollId: "r", value: 100 },
      { action: "roll-close", rollId: "r", winnerId: "a" },
    ])
      expect(gameAction.safeParse(body).success).toBe(false);
    expect(gameAction.safeParse({ action: "flip", key, headsId: "a", tailsId: "a" }).success).toBe(
      false,
    );
    expect(gameAction.parse({ action: "flip", key, headsId: "a", tailsId: "b" })).toEqual({
      action: "flip",
      key,
      headsId: "a",
      tailsId: "b",
    });
  });
  it("rejects any stake: a flip settles a tie or a decision and never moves silver", () => {
    for (const body of [
      { action: "flip", key, headsId: "a", tailsId: "b", stake: 100 },
      { action: "flip", key, headsId: "a", tailsId: "b", stake: 0 },
      { action: "call", key, call: "heads", stake: 5 },
      { action: "flip-accept", flipId: "f" },
      { action: "flip-decline", flipId: "f" },
      { action: "flip-cancel", flipId: "f" },
    ])
      expect(gameAction.safeParse(body).success).toBe(false);
  });
});

describe("loot roll results", () => {
  it("gives the drop to the single highest roll without a draw", () => {
    const pick = () => {
      throw new Error("no draw needed");
    };
    expect(
      rollWinner(
        [
          { userId: "a", value: 40 },
          { userId: "b", value: 91 },
          { userId: "c", value: 12 },
        ],
        pick,
      ),
    ).toEqual({ winnerId: "b", tied: ["b"] });
    expect(rollWinner([], pick)).toEqual({ winnerId: null, tied: [] });
  });
  it("breaks a tie at the top with a server draw among the tied only", () => {
    const entries = [
      { userId: "c", value: 88 },
      { userId: "a", value: 88 },
      { userId: "b", value: 20 },
    ];
    expect(rollWinner(entries, () => 1)).toEqual({ winnerId: "c", tied: ["a", "c"] });
    expect(rollWinner(entries, () => 0).winnerId).toBe("a");
  });
  it("shares the roll's silver evenly, whole silver, adding up exactly", () => {
    const shares = rollShares(1_000, ["c", "a", "b"], false);
    expect(shares).toEqual([
      { userId: "a", silver: 334 },
      { userId: "b", silver: 333 },
      { userId: "c", silver: 333 },
    ]);
    const withPot = rollShares(1_001, ["a", "b", "c"], true);
    expect(withPot.reduce((t, r) => t + r.silver, 0)).toBe(1_001);
    expect(withPot.find((r) => r.userId === null)).toEqual({ userId: null, silver: 250 });
    expect(rollShares(0, ["a"], true)).toEqual([]);
    expect(rollShares(500, [], true)).toEqual([{ userId: null, silver: 500 }]);
    expect(rollShares(500, [], false)).toEqual([]);
  });
});

describe("Manage wallet permission", () => {
  it("is held by the starter roles that manage loot splits and nobody else", () => {
    for (const role of seededRoles) {
      const mask = toMask(fromMask(role.permissions));
      expect(fromMask(mask).includes("manageWallet")).toBe(fromMask(mask).includes("manageLoot"));
    }
  });
  it("is required to change wallets; a plain member and an outsider lack it", () => {
    const member = resolveAccess(false, [{ position: 1, permissions: 0 }]);
    const loot = resolveAccess(false, [{ position: 2, permissions: toMask(["manageLoot"]) }]);
    expect(can(member, "manageWallet")).toBe(false);
    expect(can(null, "manageWallet")).toBe(false);
    expect(can(loot, "manageWallet")).toBe(false);
    expect(can(resolveAccess(true, []), "manageWallet")).toBe(true);
  });
});
