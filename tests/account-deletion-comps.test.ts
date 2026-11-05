import { beforeEach, expect, it, vi } from "vitest";

type Comp = { id: string; authorId: string; groupId: string | null; visibility: string };
const state = vi.hoisted(() => ({
  comps: [] as Comp[],
  owners: new Map<string, string>(),
  deleted: [] as string[],
}));
const tx = {
  user: {
    findUnique: async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      plan: "FREE",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      billingCheckout: null,
      updatedAt: new Date(0),
    }),
    delete: async ({ where }: { where: { id: string } }) => {
      state.deleted.push(where.id);
      // The schema cascades a user's remaining comps.
      state.comps = state.comps.filter((c) => c.authorId !== where.id);
    },
  },
  group: { count: async () => 0 },
  composition: {
    findMany: async ({ where }: { where: { authorId: string; visibility: string } }) =>
      state.comps
        .filter(
          (c) => c.authorId === where.authorId && c.groupId && c.visibility === where.visibility,
        )
        .map((c) => ({ id: c.id, group: { ownerId: state.owners.get(c.groupId!)! } })),
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: { in: string[] }; authorId: string };
      data: { authorId: string };
    }) => {
      for (const c of state.comps)
        if (where.id.in.includes(c.id) && c.authorId === where.authorId) c.authorId = data.authorId;
    },
  },
};
vi.mock("../src/lib/db", () => ({
  db: { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) },
  databaseService: () => undefined,
}));
const { deleteAccountRecord } = await import("../src/lib/account-deletion");

beforeEach(() => {
  state.deleted = [];
  state.owners = new Map([
    ["team-a", "owner-a"],
    ["team-b", "owner-b"],
  ]);
  state.comps = [
    { id: "shared-a", authorId: "officer", groupId: "team-a", visibility: "GROUP" },
    { id: "shared-b", authorId: "officer", groupId: "team-b", visibility: "GROUP" },
    { id: "personal", authorId: "officer", groupId: null, visibility: "PRIVATE" },
    { id: "other", authorId: "someone", groupId: "team-a", visibility: "GROUP" },
  ];
});

it("keeps an author's team comps by handing them to each team's owner", async () => {
  await expect(deleteAccountRecord("officer", null)).resolves.toEqual({ deleted: true });
  expect(state.deleted).toEqual(["officer"]);
  expect(Object.fromEntries(state.comps.map((c) => [c.id, c.authorId]))).toEqual({
    "shared-a": "owner-a",
    "shared-b": "owner-b",
    other: "someone",
  });
});
