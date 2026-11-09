import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  session: { user: { id: "owner" } } as { user: { id: string } } | null,
  update: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("next-auth", () => ({ getServerSession: async () => m.session }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));
vi.mock("../src/lib/db", () => ({
  db: { user: { update: m.update, findUnique: async () => ({ name: "Ada" }) } },
}));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("../src/lib/account-deletion", () => ({}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: vi.fn() }) }));

const form = (extra: Record<string, string> = {}) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    name: "Ada",
    region: "europe",
    characterName: "",
    ...extra,
  }))
    data.set(key, value);
  return data;
};
const save = async (data: FormData) => {
  const { saveSettings } = await import("../src/app/settings/actions");
  return saveSettings({ error: "" }, data);
};

describe("the Supporter badge preference", () => {
  beforeEach(() => {
    m.session = { user: { id: "owner" } };
    m.update.mockReset().mockResolvedValue({});
  });
  it("turns the badge off and on for the signed-in account only", async () => {
    // A forged id or userId in the body is ignored: the session decides whose row changes.
    await expect(
      save(form({ supporterBadge: "hidden", id: "other", userId: "other" })),
    ).rejects.toThrow("REDIRECT:/settings?saved=1");
    expect(m.update).toHaveBeenLastCalledWith({
      where: { id: "owner" },
      data: { region: "europe", characterName: "", showSupporterBadge: false },
    });
    await expect(save(form({ supporterBadge: "shown" }))).rejects.toThrow("REDIRECT:/settings");
    expect(m.update).toHaveBeenLastCalledWith({
      where: { id: "owner" },
      data: { region: "europe", characterName: "", showSupporterBadge: true },
    });
  });
  it("leaves the stored choice alone when the form has no toggle", async () => {
    await expect(save(form())).rejects.toThrow("REDIRECT:/settings");
    expect(m.update.mock.calls[0][0].data).not.toHaveProperty("showSupporterBadge");
  });
  it("rejects anything but shown or hidden and writes nothing", async () => {
    for (const value of ["false", "0", "", "on", "HIDDEN", "shown "]) {
      const result = await save(form({ supporterBadge: value }));
      expect(result.error).toContain("Check");
    }
    expect(m.update).not.toHaveBeenCalled();
  });
  it("sends a signed-out visitor to sign in and writes nothing", async () => {
    m.session = null;
    await expect(save(form({ supporterBadge: "hidden" }))).rejects.toThrow("REDIRECT:/signin");
    expect(m.update).not.toHaveBeenCalled();
  });
});
