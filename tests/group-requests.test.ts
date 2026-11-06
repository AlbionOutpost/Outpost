import { beforeEach, describe, expect, it, vi } from "vitest";

type Request = { status: string; message: string };
const groups = new Map<
  string,
  { id: string; ownerId: string; visibility: string; recruiting: boolean }
>();
const members = new Set<string>();
const requests = new Map<string, Request>();
const key = (w: { groupId_userId: { groupId: string; userId: string } }) =>
  `${w.groupId_userId.groupId}:${w.groupId_userId.userId}`;

const tx = {
  group: {
    findUnique: async ({ where }: { where: { id: string } }) => groups.get(where.id) ?? null,
  },
  groupMember: {
    findUnique: async ({ where }: { where: Parameters<typeof key>[0] }) =>
      members.has(key(where)) ? { role: "MEMBER" } : null,
  },
  groupMembershipRequest: {
    findUnique: async ({ where }: { where: Parameters<typeof key>[0] }) =>
      requests.get(key(where)) ?? null,
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: Parameters<typeof key>[0];
      create: Request;
      update: Request;
    }) => {
      const k = key(where);
      requests.set(
        k,
        requests.has(k) ? { ...requests.get(k)!, ...update } : { ...create, status: "PENDING" },
      );
    },
  },
};

vi.mock("@/lib/db", () => ({
  db: { $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx) },
  databaseService: () => undefined,
}));
const { mutateGroup } = await import("@/lib/groups/service");

describe("team membership requests", () => {
  beforeEach(() => {
    groups.clear();
    members.clear();
    requests.clear();
    groups.set("pub", { id: "pub", ownerId: "owner", visibility: "PUBLIC", recruiting: true });
    groups.set("priv", { id: "priv", ownerId: "owner", visibility: "PRIVATE", recruiting: true });
  });

  it("queues a request for a public team", async () => {
    await expect(mutateGroup("pub", "u1", { action: "request", message: "hi" })).resolves.toEqual({
      requested: true,
    });
    expect(requests.get("pub:u1")?.status).toBe("PENDING");
  });

  it("answers a private team exactly like a missing one", async () => {
    const priv = mutateGroup("priv", "u1", { action: "request", message: "hi" });
    const missing = mutateGroup("nope", "u1", { action: "request", message: "hi" });
    await expect(priv).rejects.toMatchObject({ status: 404, message: "Group not found" });
    await expect(missing).rejects.toMatchObject({ status: 404, message: "Group not found" });
    expect(requests.size).toBe(0);
  });

  it("refuses a public team that is not recruiting and queues nothing", async () => {
    groups.set("closed", {
      id: "closed",
      ownerId: "owner",
      visibility: "PUBLIC",
      recruiting: false,
    });
    await expect(
      mutateGroup("closed", "u1", { action: "request", message: "hi" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(requests.size).toBe(0);
  });

  it("keeps a rejection instead of reopening it", async () => {
    requests.set("pub:u1", { status: "REJECTED", message: "old" });
    await expect(
      mutateGroup("pub", "u1", { action: "request", message: "again" }),
    ).rejects.toMatchObject({
      status: 409,
    });
    expect(requests.get("pub:u1")).toEqual({ status: "REJECTED", message: "old" });
  });

  it("lets a former member who left ask again", async () => {
    requests.set("pub:u1", { status: "APPROVED", message: "old" });
    await mutateGroup("pub", "u1", { action: "request", message: "back" });
    expect(requests.get("pub:u1")?.status).toBe("PENDING");
  });
});
