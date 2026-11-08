import { beforeEach, describe, expect, it, vi } from "vitest";

// One in-memory account store: builds, comps and their revisions, behind the same Prisma calls
// the services make. `deleted` records each revision trim.
const store = vi.hoisted(() => ({
  builds: 0,
  comps: 0,
  created: [] as string[],
  trims: [] as { model: string; where: Record<string, unknown> }[],
  budget: new Map<string, number>(),
}));
const tx = {
  build: {
    count: async () => store.builds,
    create: async () => {
      store.created.push("build");
      return { id: "b-new", version: 1 };
    },
    findUnique: async () => ({
      id: "b1",
      authorId: "player",
      visibility: "PUBLIC",
      hiddenAt: null,
      title: "Source",
      description: "",
      contentType: "Solo Mists",
      region: "europe",
      playerCount: 1,
      recommendedIP: 0,
      strategy: "",
      patchNotes: "",
      equipmentSets: [],
      equipment: [
        { slot: "Main hand", itemId: "T4_MAIN_AXE", quality: 1, abilities: "", alternatives: "" },
      ],
    }),
    updateMany: async () => ({ count: 1 }),
  },
  buildEquipment: { deleteMany: async () => ({}), createMany: async () => ({}) },
  buildVersion: {
    create: async () => ({}),
    deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
      store.trims.push({ model: "buildVersion", where });
      return { count: 0 };
    },
  },
  composition: {
    count: async () => store.comps,
    create: async () => {
      store.created.push("composition");
      return { id: "c-new", version: 1 };
    },
    findUnique: async () => ({
      id: "c1",
      authorId: "player",
      hiddenAt: null,
      visibility: "PRIVATE",
      groupId: null,
      title: "Comp",
      description: "",
      region: "europe",
      contentType: "Roads",
      notes: "",
      version: 60,
      slots: [
        {
          id: "5b0f3c1e-8a52-4d7e-9a43-2f1c6d8e9b10",
          playerName: "Caller",
          role: "Tank",
          customRole: "",
          mandatory: true,
          substitute: "",
          notes: "",
          sourceBuildId: null,
          equipment: [],
          equipmentSets: [],
        },
      ],
    }),
    updateMany: async () => ({ count: 1 }),
  },
  compositionVersion: {
    create: async () => ({}),
    deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
      store.trims.push({ model: "compositionVersion", where });
      return { count: 0 };
    },
  },
  groupMember: { findUnique: async () => null },
};
vi.mock("../src/lib/db", () => ({
  db: { ...tx, $transaction: async (work: (t: typeof tx) => unknown) => work(tx) },
  databaseService: () => undefined,
}));
vi.mock("../src/lib/redis", () => ({
  // The weighted budget as the data Worker keeps it: a call that does not fit spends nothing.
  rateLimit: async (key: string, limit: number, _seconds: number, cost = 1) => {
    const used = store.budget.get(key) ?? 0;
    if (used + cost > limit) return false;
    store.budget.set(key, used + cost);
    return true;
  },
}));
vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));

const { createBuild, duplicateBuild, reviseBuild } = await import("../src/lib/builds/service");
const { saveComposition, duplicateComposition } = await import("../src/lib/compositions/service");
const { spendSaveBudget } = await import("../src/lib/http");
const { storageLimits, dailySaveLimitMessage, storedBytes } =
  await import("../src/lib/storage-limits");

const { buildInput } = await import("../src/lib/builds/validation");
const build = buildInput.parse({
  title: "Roads tank",
  description: "",
  contentType: "Solo Mists",
  region: "europe",
  visibility: "PRIVATE",
  playerCount: 1,
  recommendedIP: 0,
  strategy: "",
  patchNotes: "",
  equipmentSets: [],
  equipment: [
    { slot: "Main hand", itemId: "T4_MAIN_AXE", quality: 1, abilities: "", alternatives: "" },
  ],
});
const member = {
  id: "5b0f3c1e-8a52-4d7e-9a43-2f1c6d8e9b10",
  playerName: "Caller",
  role: "Tank",
  customRole: "",
  mandatory: true,
  substitute: "",
  notes: "",
  sourceBuildId: null,
  equipment: [],
  equipmentSets: [],
};
const comp = {
  title: "Roads roam",
  description: "",
  region: "europe",
  contentType: "Roads",
  visibility: "PRIVATE",
  groupId: null,
  notes: "",
  slots: [member],
} as const;

beforeEach(() => {
  store.builds = 0;
  store.comps = 0;
  store.created = [];
  store.trims = [];
  store.budget.clear();
});

describe("builds and comps one account can keep", () => {
  it("creates builds up to the limit and refuses the next with 409, writing nothing", async () => {
    store.builds = storageLimits.builds - 1;
    await expect(createBuild("player", build)).resolves.toEqual({ id: "b-new", version: 1 });
    store.builds = storageLimits.builds;
    await expect(createBuild("player", build)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("500 builds"),
    });
    await expect(duplicateBuild("b1", "player")).rejects.toMatchObject({ status: 409 });
    expect(store.created).toEqual(["build"]);
  });
  it("refuses a new comp at the limit, Team comps included, but still saves edits", async () => {
    store.comps = storageLimits.compositions;
    await expect(saveComposition("player", comp)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("Team comps you made count too"),
    });
    await expect(duplicateComposition("c1", "player")).rejects.toMatchObject({ status: 409 });
    expect(store.created).toEqual([]);
    // An edit of a comp the account already has is not a new comp.
    await expect(saveComposition("player", comp, "c1", 60)).resolves.toEqual({
      id: "c1",
      version: 61,
    });
  });
});

describe("revision history", () => {
  it("keeps the last 50 revisions of a build, trimmed in the same save", async () => {
    await expect(reviseBuild("b1", "player", build, 70)).resolves.toEqual({
      id: "b1",
      version: 71,
    });
    // 71 saved: 22..71 stay, 21 and older go.
    expect(store.trims).toEqual([
      { model: "buildVersion", where: { buildId: "b1", version: { lte: 21 } } },
    ]);
  });
  it("keeps the last 50 revisions of a comp", async () => {
    await saveComposition("player", comp, "c1", 60);
    expect(store.trims).toEqual([
      { model: "compositionVersion", where: { compositionId: "c1", version: { lte: 11 } } },
    ]);
  });
  it("trims nothing that exists while a build has fewer than 50 revisions", async () => {
    await reviseBuild("b1", "player", build, 3);
    expect(store.trims[0].where).toEqual({ buildId: "b1", version: { lte: -46 } });
  });
});

describe("daily save budget", () => {
  it("spends KiB per save and refuses with 429 once 50 MiB is used", async () => {
    const mib = 1024 * 1024;
    for (let i = 0; i < 50; i++)
      await expect(spendSaveBudget("player", mib)).resolves.toBe(undefined);
    await expect(spendSaveBudget("player", 1)).rejects.toMatchObject({
      status: 429,
      message: dailySaveLimitMessage,
    });
    // Another account has its own budget.
    await expect(spendSaveBudget("other", mib)).resolves.toBe(undefined);
  });
  it("refuses a save that would not fit, without spending what is left", async () => {
    await spendSaveBudget("player", 49.5 * 1024 * 1024);
    await expect(spendSaveBudget("player", 1024 * 1024)).rejects.toMatchObject({ status: 429 });
    await expect(spendSaveBudget("player", 400 * 1024)).resolves.toBe(undefined);
  });
  it("measures the stored JSON in UTF-8 bytes", () => {
    expect(storedBytes({ a: "é" })).toBe(new TextEncoder().encode('{"a":"é"}').length);
  });
});
