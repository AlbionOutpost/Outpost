import { it, expect, vi } from "vitest";
const m = vi.hoisted(() => ({
  update: vi.fn(),
  del: vi.fn(),
  count: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { id: "owner" } }) }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));
vi.mock("../src/lib/db", () => ({
  db: { user: { update: m.update, delete: m.del }, group: { count: m.count } },
}));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: vi.fn() }) }));
it("returns safe recoverable state on service errors and permits a later retry", async () => {
  const { saveSettings, deleteAccount } = await import("../src/app/settings/actions");
  const form = new FormData();
  form.set("name", "Draft retained");
  form.set("region", "europe");
  form.set("characterName", "Character");
  m.update.mockRejectedValueOnce(new Error("secret-db-password"));
  const failed = await saveSettings({ error: "" }, form);
  expect(failed.error).toContain("draft is retained");
  expect(failed.error).not.toContain("secret-db");
  m.update.mockResolvedValueOnce({});
  await expect(saveSettings({ error: "" }, form)).rejects.toThrow(
    "REDIRECT:/settings?saved=1&region=europe",
  );
  const del = new FormData();
  del.set("confirmation", "DELETE");
  m.count.mockResolvedValue(1);
  expect((await deleteAccount({ error: "" }, del)).error).toContain("Transfer group ownership");
  m.count.mockResolvedValue(0);
  m.del.mockRejectedValueOnce(new Error("secret-db"));
  expect((await deleteAccount({ error: "" }, del)).error).toContain("could not be completed");
});
