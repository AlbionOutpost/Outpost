import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readStoredComposition } from "@/lib/compositions/stored";
import { compositionInput } from "@/lib/compositions/validation";

const slot = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  playerName: "Caller",
  role: "Tank",
  customRole: "",
  mandatory: true,
  substitute: "",
  notes: "",
  sourceBuildId: null,
  equipment: [
    { slot: "Main hand", itemId: "T6_MAIN_AXE", quality: 1, abilities: {}, alternatives: [] },
  ],
  equipmentSets: [],
  ...extra,
});
const row = (slots: unknown[], extra: Record<string, unknown> = {}) => ({
  id: "comp",
  title: "Roads roam",
  description: "",
  region: "europe",
  contentType: "Roads",
  visibility: "PUBLIC",
  groupId: null,
  notes: "",
  slots,
  ...extra,
});

describe("reading a stored comp", () => {
  it("returns a valid comp unchanged", () => {
    const stored = row([slot(randomUUID())]);
    const read = readStoredComposition(stored);
    expect(read).toMatchObject({ dropped: 0, repaired: 0 });
    expect(read.composition).toEqual(compositionInput.parse(stored));
  });

  it("gives members with non-UUID or repeated ids fresh ids and leaves out unreadable members", () => {
    const shared = randomUUID();
    const read = readStoredComposition(
      row([slot("slot-1"), slot(shared), slot(shared), slot(randomUUID(), { role: "Not a role" })]),
    );
    expect(read.dropped).toBe(1);
    expect(read.repaired).toBe(2);
    expect(read.composition.slots).toHaveLength(3);
    expect(new Set(read.composition.slots.map((s) => s.id)).size).toBe(3);
    // What it returns is a comp the editor can save under today's rules.
    expect(compositionInput.safeParse(read.composition).success).toBe(true);
  });

  it("falls back for fields that no longer validate", () => {
    const read = readStoredComposition(row("not a list" as unknown as unknown[], { title: "" }));
    expect(read.composition.title).toBe("Untitled comp");
    expect(read.composition.slots).toEqual([]);
  });

  it("does not loosen validation of new writes", () => {
    expect(compositionInput.safeParse(row([slot("slot-1")])).success).toBe(false);
  });
});
