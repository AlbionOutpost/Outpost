import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanDisplayName, displayName, reservedDisplayName } from "../src/lib/display-name";

const ch = (...codes: number[]) => String.fromCodePoint(...codes);

describe("cleanDisplayName", () => {
  it("strips bidi overrides and isolates, zero-width and other format characters", () => {
    // Right-to-left override flips how the rest reads; isolates and marks hide in the name.
    expect(cleanDisplayName(`Kara${ch(0x202e)}nimda`)).toBe("Karanimda");
    expect(cleanDisplayName(`${ch(0x2066)}Kara${ch(0x2069)}`)).toBe("Kara");
    expect(cleanDisplayName(`K${ch(0x200b)}a${ch(0x200c)}r${ch(0x200d)}a${ch(0xfeff)}`)).toBe(
      "Kara",
    );
    expect(cleanDisplayName(`Ka${ch(0xad)}ra${ch(0x2060)}`)).toBe("Kara");
    expect(cleanDisplayName(`Ka${ch(0x200e)}ra${ch(0x200f)}`)).toBe("Kara");
  });
  it("strips control characters and letters that render blank", () => {
    expect(cleanDisplayName(`Ka${ch(0x07)}ra${ch(0x1b)}`)).toBe("Kara");
    expect(cleanDisplayName(ch(0x3164, 0x3164))).toBe("");
    expect(cleanDisplayName(`${ch(0x2800)}Kara${ch(0x115f)}`)).toBe("Kara");
  });
  it("collapses every kind of whitespace and trims", () => {
    expect(cleanDisplayName(`  Kara \t\n  the${ch(0x3000)}${ch(0xa0)}Bold ${ch(0x2028)} `)).toBe(
      "Kara the Bold",
    );
  });
  it("keeps real names, accents, scripts and emoji untouched", () => {
    for (const name of ["Kára", "Мария", "東京の剣士", "Nyx 🐉", "O'Brien-Smith"])
      expect(cleanDisplayName(name)).toBe(name);
  });
});

describe("reservedDisplayName", () => {
  it("reserves names that read as Outpost or its staff", () => {
    for (const name of [
      "Outpost",
      "outpost staff",
      "OUTPOST-STAFF",
      "Albion Outpost",
      "Admin",
      "Administrator",
      "moderator",
      "Mod",
      "Official",
      "Support",
      "System",
      "Staff",
      "Admin Kara",
      "Kara [Moderator]",
      "Outpost Bot",
    ])
      expect(reservedDisplayName(name), name).toBe(true);
  });
  it("sees through case, accents, spacing, punctuation and look-alike letters", () => {
    for (const name of [
      "0utp0st",
      "Outp0st St4ff",
      "A d m i n",
      "a.d.m.i.n",
      "ADM1N",
      "adm!n",
      "Ádmín",
      `${ch(0x430)}dmin`, // Cyrillic a
      `${ch(0x41e)}utpost`, // Cyrillic O
      `Supp${ch(0x3bf)}rt`, // Greek omicron
      "Adrnin", // r + n reads as m
      "Ｏｕｔｐｏｓｔ", // full-width
      `Ad${ch(0x200b)}min`,
    ])
      expect(reservedDisplayName(name), name).toBe(true);
  });
  it("leaves ordinary player names alone", () => {
    for (const name of [
      "Kara",
      "Badminton",
      "Sysadmin",
      "Outposter",
      "Support Main",
      "Fire Staff Main",
      "Modest",
      "Systematic",
      "Officially Kara",
      "Adventurer",
      "",
    ])
      expect(reservedDisplayName(name), name).toBe(false);
  });
});

describe("displayName", () => {
  it("shows a cleaned name, and Adventurer for empty or reserved ones", () => {
    expect(displayName(`  Kara${ch(0x202e)}  `)).toBe("Kara");
    expect(displayName(null)).toBe("Adventurer");
    expect(displayName(ch(0x200b))).toBe("Adventurer");
    expect(displayName("Outpost Staff")).toBe("Adventurer");
    expect(displayName("Admin", "Player")).toBe("Player");
  });
});

// Settings: a name is checked when it changes; a stored one is never rewritten otherwise.
const m = vi.hoisted(() => ({
  stored: "Kara" as string | null,
  update: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: { id: "owner" } }) }));
vi.mock("../src/lib/auth", () => ({ authOptions: {} }));
vi.mock("../src/lib/db", () => ({
  db: { user: { update: m.update, findUnique: async () => ({ name: m.stored }) } },
}));
vi.mock("../src/lib/redis", () => ({ rateLimit: async () => true }));
vi.mock("../src/lib/account-deletion", () => ({}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: vi.fn() }) }));
const form = (name: string) => {
  const f = new FormData();
  f.set("name", name);
  f.set("region", "europe");
  f.set("characterName", "");
  return f;
};

describe("changing a display name in settings", () => {
  beforeEach(() => {
    m.update.mockReset().mockResolvedValue({});
    m.stored = "Kara";
  });
  it("refuses a reserved or invisible name and writes nothing", async () => {
    const { saveSettings } = await import("../src/app/settings/actions");
    for (const name of ["Outpost Staff", "Adm1n", `${ch(0x41e)}utpost`])
      expect((await saveSettings({ error: "" }, form(name))).error, name).toContain("reserved");
    expect((await saveSettings({ error: "" }, form(ch(0x200b, 0x3164)))).error).toContain(
      "visible letters",
    );
    expect(m.update).not.toHaveBeenCalled();
  });
  it("saves a new name cleaned of hidden characters", async () => {
    const { saveSettings } = await import("../src/app/settings/actions");
    await expect(saveSettings({ error: "" }, form(`Nyx${ch(0x202e)}  the  Bold`))).rejects.toThrow(
      "REDIRECT:/settings",
    );
    expect(m.update.mock.lastCall?.[0].data.name).toBe("Nyx the Bold");
  });
  it("leaves an existing name as stored when it is not changed, even a reserved one", async () => {
    const { saveSettings } = await import("../src/app/settings/actions");
    m.stored = "Admin ";
    await expect(saveSettings({ error: "" }, form("Admin"))).rejects.toThrow("REDIRECT:/settings");
    expect(m.update.mock.lastCall?.[0].data).not.toHaveProperty("name");
    expect(m.update.mock.lastCall?.[0].data.region).toBe("europe");
  });
});
