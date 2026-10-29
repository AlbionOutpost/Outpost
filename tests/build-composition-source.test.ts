import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/db", () => ({ db: { build: { findUnique: mocks.find } } }));
vi.mock("../src/lib/grind-library", () => ({
  findLibraryBuild: vi.fn(),
  librarySpellNames: async () => ({}),
}));
import { resolveBuildLoadout } from "../src/lib/compositions/build-loadout-source";
beforeEach(() => {
  vi.clearAllMocks();
});
function record(visibility = "PUBLIC", hiddenAt: Date | null = null) {
  return {
    id: "public-build",
    authorId: "owner",
    title: "Axe",
    description: "",
    strategy: "",
    contentType: "Solo PvE",
    visibility,
    hiddenAt,
    equipmentSets: [],
    equipment: [
      {
        slot: "Main hand",
        itemId: "T4_MAIN_AXE",
        quality: 1,
        abilitySelections: {},
        alternativeItemIds: [],
        abilities: "",
        alternatives: "",
      },
    ],
  };
}
it.each(["PUBLIC", "UNLISTED"])(
  "copies readable %s builds without changing ownership",
  async (visibility) => {
    mocks.find.mockResolvedValue(record(visibility));
    expect((await resolveBuildLoadout("public-build", "reader")).sourceBuildId).toBe(
      "public-build",
    );
    expect(mocks.find).toHaveBeenCalledTimes(1);
  },
);
it("permits own private/hidden source and denies outsiders before parsing any private fields", async () => {
  mocks.find.mockResolvedValue(record("PRIVATE", new Date()));
  expect((await resolveBuildLoadout("public-build", "owner")).sourceBuildId).toBe("public-build");
  await expect(resolveBuildLoadout("public-build", "outsider")).rejects.toMatchObject({
    status: 404,
    message: "Build not found",
  });
  mocks.find.mockResolvedValue({
    ...record("PUBLIC", new Date()),
    equipment: [{ itemId: "secret-invalid" }],
  });
  await expect(resolveBuildLoadout("public-build", "outsider")).rejects.toMatchObject({
    status: 404,
  });
});
it("fails closed for missing session, invalid id, unknown build and unsupported equipment", async () => {
  await expect(resolveBuildLoadout("public-build", "")).rejects.toMatchObject({ status: 401 });
  await expect(resolveBuildLoadout("../invalid", "owner")).rejects.toMatchObject({ status: 400 });
  expect(mocks.find).not.toHaveBeenCalled();
  mocks.find.mockResolvedValue(null);
  await expect(resolveBuildLoadout("public-build", "owner")).rejects.toMatchObject({ status: 404 });
  mocks.find.mockResolvedValue({
    ...record(),
    equipment: [
      {
        slot: "Main hand",
        itemId: "T4_INVALID",
        quality: 1,
        abilitySelections: {},
        alternativeItemIds: [],
      },
    ],
  });
  await expect(resolveBuildLoadout("public-build", "owner")).rejects.toMatchObject({ status: 422 });
});
