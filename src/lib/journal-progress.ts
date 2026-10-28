import { z } from "zod";
import { regionSchema } from "./albion/region-config";
export type JournalEntry = {
  entryId: string;
  name: string;
  rewardId: string;
  reward: string;
  category: string;
};
export const journalProgress = z
  .object({
    version: z.literal(1),
    region: regionSchema,
    completed: z.array(z.string().regex(/^(?:JOURNAL|SA)_[A-Z0-9_.]{1,150}$/)).max(5000),
  })
  .strict()
  .refine(
    (v) => new Set(v.completed).size === v.completed.length,
    "Duplicate objectives in progress backup",
  );
export function parseJournalProgress(raw: string, region: string, allowedIds: ReadonlySet<string>) {
  if (raw.length > 512000) throw Error("The progress file exceeds 512KB.");
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw Error("Choose a valid Outpost journal progress JSON file.");
  }
  const result = journalProgress.safeParse(decoded);
  if (!result.success)
    throw Error("Choose a valid Outpost journal progress backup with unique objective IDs.");
  const parsed = result.data;
  if (parsed.region !== region)
    throw Error("This backup belongs to another region. Switch region before importing it.");
  if (parsed.completed.some((id) => !allowedIds.has(id)))
    throw Error("This backup contains objectives outside the recovered journal.");
  return parsed.completed;
}
