import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  users: new Map<string, { role: string; provider: string; providerAccountId: string }>(),
}));
vi.mock("../src/lib/db", () => ({
  db: {
    user: {
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; accounts: { some: { provider: string; providerAccountId: string } } };
        data: { role: string };
      }) => {
        const user = state.users.get(where.id),
          identity = where.accounts.some;
        if (
          !user ||
          user.provider !== identity.provider ||
          user.providerAccountId !== identity.providerAccountId
        )
          return { count: 0 };
        user.role = data.role;
        return { count: 1 };
      },
    },
  },
}));
import { grantOwnerAdmin, promotePersistedOwner } from "../src/lib/owner-admin";
const owner = "303585687460904970";
beforeEach(() => {
  vi.stubEnv("OUTPOST_OWNER_DISCORD_ID", owner);
  state.users.clear();
  state.users.set("owner", { role: "USER", provider: "discord", providerAccountId: owner });
  state.users.set("outsider", {
    role: "USER",
    provider: "discord",
    providerAccountId: "999999999999999999",
  });
});
afterEach(() => vi.unstubAllEnvs());
describe("verified Discord owner assignment", () => {
  it("grants the configured identity admin after its persisted provider link exists", async () => {
    await grantOwnerAdmin("owner", { provider: "discord", providerAccountId: owner });
    expect(state.users.get("owner")?.role).toBe("ADMIN");
  });
  it("does not grant roles to another verified Discord account", async () => {
    await grantOwnerAdmin("outsider", {
      provider: "discord",
      providerAccountId: "999999999999999999",
    });
    expect(state.users.get("outsider")?.role).toBe("USER");
  });
  it("a claimed owner identity cannot promote a user with a different persisted link", async () => {
    await grantOwnerAdmin("outsider", { provider: "discord", providerAccountId: owner });
    expect(state.users.get("outsider")?.role).toBe("USER");
  });
  it.each([null, { provider: "github", providerAccountId: owner }])(
    "requires the verified Discord provider",
    async (account) => {
      await grantOwnerAdmin("owner", account);
      expect(state.users.get("owner")?.role).toBe("USER");
    },
  );
  it("fails closed when the configured owner is absent or malformed", async () => {
    for (const value of ["", "bad-id"]) {
      vi.stubEnv("OUTPOST_OWNER_DISCORD_ID", value);
      await grantOwnerAdmin("owner", { provider: "discord", providerAccountId: owner });
      expect(state.users.get("owner")?.role).toBe("USER");
    }
  });
});

it("promotes an existing authenticated owner using only the stored Discord link", async () => {
  await promotePersistedOwner("owner");
  expect(state.users.get("owner")?.role).toBe("ADMIN");
  await promotePersistedOwner("outsider");
  expect(state.users.get("outsider")?.role).toBe("USER");
});
