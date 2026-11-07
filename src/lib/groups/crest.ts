import { z } from "zod";

/**
 * A Team crest is a painted shield (public/albion/crests) with a painted symbol on it
 * (public/albion/charges). Both are fixed lists, so the server validates a choice without any
 * lookup. Every team starts on the default crest until a member with Manage team picks another.
 */
export const crestCharges = [
  "tower",
  "sword",
  "shield",
  "crown",
  "helm",
  "skull",
  "axes",
  "hammer",
  "bow",
  "potion",
  "chest",
  "coins",
  "flame",
  "star",
  "eye",
  "wolf",
  "eagle",
  "leaf",
  "mountain",
  "anchor",
  "lightning",
  "pickaxe",
  "wheat",
  "tree",
  "flag",
  "gauntlet",
  "horseshoe",
  "diamond",
  "hourglass",
  "compass",
  "moon",
  "sun",
  "key",
  "mask",
  "snake",
  "rose",
  "paw",
  "wheel",
  "book",
  "chalice",
] as const;
export type CrestCharge = (typeof crestCharges)[number];
/** The crest every team has until it picks one: the Outpost tower on the orange shield. */
export const defaultCrest = { charge: "tower", color: "orange" } as const;

/** Painted shield fields (public/albion/crests/crest-<colour>.webp). */
export const crestColors = [
  "orange",
  "gold",
  "red",
  "burgundy",
  "rose",
  "violet",
  "navy",
  "blue",
  "frost",
  "teal",
  "sage",
  "green",
  "silver",
  "obsidian",
] as const;
export type CrestColor = (typeof crestColors)[number];

/** Colours saved before the painted shields, mapped to their nearest shield. */
const legacyCrestColors: Record<string, CrestColor> = {
  ember: "orange",
  crimson: "red",
  forest: "green",
  azure: "blue",
  steel: "silver",
};
export const resolveCrestColor = (color?: string | null): CrestColor =>
  crestColors.includes(color as CrestColor)
    ? (color as CrestColor)
    : (legacyCrestColors[color ?? ""] ?? defaultCrest.color);
/** The symbol on the shield; item renders saved before the painted symbols fall back to the default. */
export const resolveCrestCharge = (charge?: string | null): CrestCharge =>
  crestCharges.includes(charge as CrestCharge) ? (charge as CrestCharge) : defaultCrest.charge;

/** What a team plays: up to three build activities, stored ",ZvZ,Ganking," for whole-name filters. */
// The build activities (contentTypes in builds/validation, without "Other"), kept here so client
// pickers don't pull in the equipment catalog; tests/team-crest.test.ts keeps the two in step.
export const teamActivities = [
  "Solo Mists",
  "Duo Mists",
  "Corrupted Dungeons",
  "Open World",
  "Solo PvE",
  "Group PvE",
  "Group Dungeons",
  "Avalonian Dungeons",
  "Ganking",
  "Small Scale PvP",
  "Hellgates",
  "Arena",
  "Crystal Arena",
  "ZvZ",
  "Roaming",
  "Faction Warfare",
  "Gathering",
] as const;
export type TeamActivity = (typeof teamActivities)[number];
export const encodeActivities = (list: readonly string[]) =>
  list.length ? `,${list.join(",")},` : "";
export const decodeActivities = (stored?: string | null): TeamActivity[] =>
  (stored ?? "")
    .split(",")
    .filter((a): a is TeamActivity => (teamActivities as readonly string[]).includes(a));

/** A workspace address: lowercase letters and digits in runs joined by single hyphens, 3–60 long. */
export const teamSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const teamSlug = z.string().regex(teamSlugPattern).min(3).max(60);
/** The address a name suggests ("Ironbound Company" → "ironbound-company"), within the rules above. */
export const slugFromName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");

/** The crest, activities and recruiting fields shared by creating a team and editing its profile. */
export const teamIdentity = {
  crestItem: z.enum(crestCharges).nullable().default(null),
  crestColor: z.enum(crestColors).nullable().default(null),
  activities: z
    .array(z.enum(teamActivities))
    .max(3)
    .refine((list) => new Set(list).size === list.length, "Choose each activity once")
    .default([])
    .transform(encodeActivities),
  recruiting: z.boolean().default(true),
};
