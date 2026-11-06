import { beforeEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const slot = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  playerName: "Caller",
  role: "Tank",
  customRole: "",
  mandatory: true,
  substitute: "",
  notes: "",
  sourceBuildId: null,
  equipment: [],
  equipmentSets: [],
  ...extra,
});
const state = vi.hoisted(() => ({
  stored: null as Record<string, unknown> | null,
  created: [] as Record<string, unknown>[],
  updated: [] as Record<string, unknown>[],
}));
const client = {
  composition: {
    findUnique: async () => state.stored,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.created.push(data);
      return { id: "copy", version: 1 };
    },
    updateMany: async ({ data }: { data: Record<string, unknown> }) => {
      state.updated.push(data);
      return { count: 1 };
    },
  },
  compositionVersion: { create: async () => ({}) },
  build: { findUnique: async () => null },
  groupMember: { findUnique: async () => null },
};
vi.mock("../src/lib/db", () => ({
  db: { ...client, $transaction: async (fn: (t: typeof client) => unknown) => fn(client) },
  databaseService: () => undefined,
}));
const { duplicateComposition, saveComposition } = await import("../src/lib/compositions/service");
const { compositionInput } = await import("../src/lib/compositions/validation");

const comp = (slots: unknown[]) => ({
  id: "old",
  authorId: "author",
  hiddenAt: null,
  title: "Imported roads roam",
  description: "",
  region: "europe",
  contentType: "Roads",
  visibility: "PUBLIC",
  groupId: null,
  notes: "",
  version: 3,
  slots,
});

beforeEach(() => {
  state.created = [];
  state.updated = [];
  state.stored = comp([slot("slot-1"), slot("slot-2"), slot(randomUUID(), { role: "Nope" })]);
});

it("duplicates a stored comp whose member ids are not UUIDs", async () => {
  await expect(duplicateComposition("old", "author")).resolves.toEqual({ id: "copy", version: 1 });
  const copy = state.created[0] as { slots: { id: string }[]; visibility: string; title: string };
  expect(copy.title).toBe("Imported roads roam (copy)");
  expect(copy.visibility).toBe("PRIVATE");
  // The unreadable member is left out; the rest get fresh UUIDs and pass today's rules.
  expect(copy.slots).toHaveLength(2);
  expect(compositionInput.safeParse(copy).success).toBe(true);
});

it("saves a new revision over a stored comp whose member ids are not UUIDs", async () => {
  const next = compositionInput.parse({ ...comp([slot(randomUUID())]), notes: "New plan" });
  await expect(saveComposition("author", next, "old", 3)).resolves.toEqual({
    id: "old",
    version: 4,
  });
  expect(state.updated[0]).toMatchObject({ notes: "New plan" });
});

it("still rejects a new write with a non-UUID member id", async () => {
  await expect(saveComposition("author", comp([slot("slot-1")]), "old", 3)).rejects.toThrow();
  expect(state.updated).toHaveLength(0);
});
