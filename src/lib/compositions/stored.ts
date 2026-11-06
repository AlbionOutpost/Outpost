import { z } from "zod";
import { regionSchema } from "../albion/region-config";
import { logEvent } from "../logging";
import { compositionInput, memberSlot, type CompositionInput, type MemberSlot } from "./validation";

/** Comp fields as stored; a field that no longer validates falls back so the page still opens. */
const storedFields = z.object({
  title: z.string().trim().min(1).max(100).catch("Untitled comp"),
  description: z.string().max(4000).catch(""),
  region: regionSchema.catch("europe"),
  contentType: z.string().trim().min(1).max(80).catch("Comp"),
  visibility: z.enum(["PUBLIC", "PRIVATE", "GROUP"]).catch("PRIVATE"),
  groupId: z.string().max(100).nullable().catch(null),
  notes: z.string().max(12000).catch(""),
});

/** Reads one stored member; an id that is not a UUID (older imports) gets a fresh one. */
function storedSlot(value: unknown, seen: Set<string>): MemberSlot | null {
  const parsed = memberSlot.safeParse(value);
  if (parsed.success && !seen.has(parsed.data.id)) return parsed.data;
  if (!value || typeof value !== "object") return null;
  const repaired = memberSlot.safeParse({ ...value, id: crypto.randomUUID() });
  return repaired.success ? repaired.data : null;
}

/**
 * A stored comp for reading and editing. Rows written before today's validation can carry
 * member ids that are not UUIDs or a member that no longer validates; rather than failing the
 * page, members get fresh ids where that is all that is wrong, members that cannot be read are
 * left out and counted, and the event is logged. Writes still go through `compositionInput`.
 */
export function readStoredComposition(row: { id: string } & Record<string, unknown>): {
  composition: CompositionInput;
  dropped: number;
  repaired: number;
} {
  const strict = compositionInput.safeParse(row);
  if (strict.success) return { composition: strict.data, dropped: 0, repaired: 0 };
  const raw = Array.isArray(row.slots) ? row.slots : [];
  const seen = new Set<string>();
  let repaired = 0;
  const slots = raw.flatMap((value) => {
    const slot = storedSlot(value, seen);
    if (!slot) return [];
    if ((value as { id?: unknown }).id !== slot.id) repaired++;
    seen.add(slot.id);
    return [slot];
  });
  const fields = storedFields.parse(row);
  const dropped = raw.length - slots.length;
  logEvent("info", "composition.stored_invalid", {
    operation: "read",
    code: `dropped:${dropped},repaired:${repaired}`,
  });
  return {
    composition: {
      ...fields,
      groupId: fields.visibility === "GROUP" ? fields.groupId : null,
      slots,
    },
    dropped,
    repaired,
  };
}
