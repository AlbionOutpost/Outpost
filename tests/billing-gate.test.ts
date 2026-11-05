import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const users = new Map<string, { plan: string }>();
const groups = new Map<string, { ownerId: string }>();
const members = new Set<string>();
vi.mock("@/lib/db", () => ({
  db: {
    groupMember: {
      findUnique: async ({
        where,
      }: {
        where: { groupId_userId: { groupId: string; userId: string } };
      }) => {
        const { groupId, userId } = where.groupId_userId;
        return members.has(`${groupId}:${userId}`) ? { userId } : null;
      },
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null,
    },
    group: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const g = groups.get(where.id);
        return g ? { owner: users.get(g.ownerId) ?? { plan: "FREE" } } : null;
      },
    },
  },
  databaseService: () => undefined,
}));
import { requireTeamCreation, requireTeamManagement, canCreateTeam } from "@/lib/billing/gate";

describe("Supporter gates", () => {
  const env = { ...process.env };
  beforeEach(() => {
    users.clear();
    groups.clear();
    members.clear();
    users.set("free", { plan: "FREE" });
    users.set("sup", { plan: "SUPPORTER" });
    groups.set("g-free", { ownerId: "free" });
    groups.set("g-sup", { ownerId: "sup" });
  });
  afterEach(() => {
    process.env = { ...env };
  });
  it("locks nothing while billing is not configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(await canCreateTeam("free")).toBe(true);
    await expect(requireTeamManagement("g-free", "delete")).resolves.toBeUndefined();
  });
  it("needs the Supporter plan to create or manage a team once billing is on", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    process.env.STRIPE_PRICE_SUPPORTER = "price_1";
    await expect(requireTeamCreation("free")).rejects.toMatchObject({ status: 402 });
    await expect(requireTeamCreation("sup")).resolves.toBeUndefined();
    await expect(requireTeamManagement("g-free", "event")).rejects.toMatchObject({ status: 402 });
    await expect(requireTeamManagement("g-sup", "event")).resolves.toBeUndefined();
    // Participation stays open on a lapsed team; the loot route passes no action and is gated.
    await expect(requireTeamManagement("g-free", "rsvp")).resolves.toBeUndefined();
    await expect(requireTeamManagement("g-free", "leave")).resolves.toBeUndefined();
    await expect(requireTeamManagement("g-free")).rejects.toMatchObject({ status: 402 });
    await expect(requireTeamManagement("missing", "event")).rejects.toMatchObject({ status: 402 });
    // Winding down stays open on a lapsed team.
    for (const a of ["remove", "transfer", "delete"])
      await expect(requireTeamManagement("g-free", a)).resolves.toBeUndefined();
  });
  it("lets outsiders through to the service's 404 instead of revealing the owner's plan", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    process.env.STRIPE_PRICE_SUPPORTER = "price_1";
    members.add("g-free:free");
    await expect(requireTeamManagement("g-free", "event", "free")).rejects.toMatchObject({
      status: 402,
    });
    await expect(requireTeamManagement("g-free", "event", "stranger")).resolves.toBeUndefined();
    await expect(requireTeamManagement("missing", "event", "stranger")).resolves.toBeUndefined();
  });
});
