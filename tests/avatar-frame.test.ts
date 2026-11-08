import { beforeEach, expect, it, vi } from "vitest";
import { resolveAvatarFrame } from "@/lib/avatar-frames";
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
  db: { user: { update: m.update, findUnique: async () => ({ name: "Framed" }) } },
}));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("../src/lib/account-deletion", () => ({}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: vi.fn() }) }));

const form = (avatarFrame?: string) => {
  const f = new FormData();
  f.set("name", "Framed");
  f.set("region", "europe");
  f.set("characterName", "");
  if (avatarFrame !== undefined) f.set("avatarFrame", avatarFrame);
  return f;
};
beforeEach(() => {
  m.update.mockReset().mockResolvedValue({});
  m.session = { user: { id: "owner" } };
});

it("rejects a frame outside the allow-list without writing", async () => {
  const { saveSettings } = await import("../src/app/settings/actions");
  for (const frame of ["diamond", "/albion/frames/gold.png", "GOLD", ""])
    expect((await saveSettings({ error: "" }, form(frame))).error).toContain("frame");
  expect(m.update).not.toHaveBeenCalled();
});

it("saves a listed frame, or none as null, only on the signed-in player's own row", async () => {
  const { saveSettings } = await import("../src/app/settings/actions");
  await expect(saveSettings({ error: "" }, form("gold"))).rejects.toThrow("REDIRECT:/settings");
  expect(m.update).toHaveBeenLastCalledWith({
    where: { id: "owner" },
    data: expect.objectContaining({ avatarFrame: "gold" }),
  });
  await expect(saveSettings({ error: "" }, form("none"))).rejects.toThrow("REDIRECT:/settings");
  expect(m.update.mock.lastCall?.[0].data.avatarFrame).toBeNull();
  await expect(saveSettings({ error: "" }, form())).rejects.toThrow("REDIRECT:/settings");
  expect(m.update.mock.lastCall?.[0].data).not.toHaveProperty("avatarFrame");
});

it("sends a signed-out request to sign in without writing", async () => {
  const { saveSettings } = await import("../src/app/settings/actions");
  m.session = null;
  await expect(saveSettings({ error: "" }, form("gold"))).rejects.toThrow("REDIRECT:/signin");
  expect(m.update).not.toHaveBeenCalled();
});

it("reads unknown or retired stored frames as the plain picture", () => {
  expect(resolveAvatarFrame("crystal")).toBe("crystal");
  expect(resolveAvatarFrame("toString")).toBeNull();
  expect(resolveAvatarFrame("retired")).toBeNull();
  expect(resolveAvatarFrame(null)).toBeNull();
});
