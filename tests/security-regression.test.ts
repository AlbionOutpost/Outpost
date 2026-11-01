import { describe, expect, it } from "vitest";
import { buildInput, canReadBuild } from "@/lib/builds/validation";

/**
 * These lock the guarantees that the seven findings against the old albiononlinegrind.com
 * (a Supabase app with a public anon key) would have needed. Outpost prevents each by
 * construction — server routes re-check ownership, owners come from the session, and there is
 * no public database API — and this file keeps a regression from quietly reopening one.
 */

const validBuild = {
  equipmentSets: [],
  title: "Regression build",
  description: "",
  contentType: "ZvZ",
  region: "europe",
  visibility: "PRIVATE",
  playerCount: 1,
  recommendedIP: 0,
  strategy: "",
  patchNotes: "",
  equipment: [
    {
      slot: "Main hand",
      itemId: "T4_MAIN_SWORD",
      quality: 1,
      abilities: "",
      alternatives: "",
      abilitySelections: {},
      alternativeItemIds: [],
    },
  ],
} as const;

describe("build ownership cannot be spoofed by the client (S-05, S-06)", () => {
  it("drops any client-supplied owner field", () => {
    const parsed = buildInput.parse({
      ...validBuild,
      authorId: "victim-account",
      user_id: "victim-account",
      userId: "victim-account",
      id: "chosen-id",
    });
    expect("authorId" in parsed).toBe(false);
    expect("user_id" in parsed).toBe(false);
    expect("userId" in parsed).toBe(false);
    expect("id" in parsed).toBe(false);
  });
});

describe("private drafts are readable only by their owner (S-03)", () => {
  it("hides a PRIVATE build from a signed-out reader and from another account", () => {
    expect(canReadBuild("PRIVATE", "owner", undefined)).toBe(false);
    expect(canReadBuild("PRIVATE", "owner", "someone-else")).toBe(false);
    expect(canReadBuild("PRIVATE", "owner", "owner")).toBe(true);
  });
  it("keeps shared visibilities open", () => {
    expect(canReadBuild("PUBLIC", "owner", undefined)).toBe(true);
    expect(canReadBuild("UNLISTED", "owner", "anyone")).toBe(true);
  });
});

describe("plan and role are not client-writable (S-01)", () => {
  it("the build input schema exposes no plan, role or status field", () => {
    const parsed = buildInput.parse({
      ...validBuild,
      plan: "SUPPORTER",
      role: "ADMIN",
      patreon_status: "active_patron",
    }) as Record<string, unknown>;
    expect("plan" in parsed).toBe(false);
    expect("role" in parsed).toBe(false);
    expect("patreon_status" in parsed).toBe(false);
  });
});
