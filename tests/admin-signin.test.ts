import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ ban: vi.fn(), session: vi.fn() }));
vi.mock("../src/lib/db", () => ({
  db: { discordBan: { findUnique: state.ban } },
  databaseService: () => undefined,
}));
vi.mock("../src/lib/admin/sessions", () => ({
  activeSession: state.session,
  createActiveSession: vi.fn(),
}));
vi.mock("../src/lib/owner-admin", () => ({
  grantOwnerAdmin: vi.fn(),
  promotePersistedOwner: vi.fn(),
}));
import { authOptions } from "../src/lib/auth";
beforeEach(() => {
  state.ban.mockReset();
  state.session.mockReset();
});
const signin = () =>
  authOptions.callbacks!.signIn!({
    user: { id: "fixture-user" },
    account: { provider: "discord", providerAccountId: "123456789012345678", type: "oauth" },
  });
describe("Discord ban enforcement before account creation", () => {
  it("blocks a banned Discord identity even without a stored Outpost account", async () => {
    state.ban.mockResolvedValue({ revokedAt: null, expiresAt: null });
    expect(await signin()).toBe(false);
    expect(state.ban).toHaveBeenCalledWith({ where: { discordId: "123456789012345678" } });
  });
  it.each([
    { revokedAt: new Date(), expiresAt: null },
    { revokedAt: null, expiresAt: new Date(0) },
    null,
  ])("permits a revoked/expired/absent ban", async (ban) => {
    state.ban.mockResolvedValue(ban);
    expect(await signin()).toBe(true);
  });
  it("fails closed when the ban store is unavailable", async () => {
    state.ban.mockRejectedValue(Error("store unavailable"));
    await expect(signin()).rejects.toThrow("store unavailable");
  });
});
