import { z } from "zod";

/**
 * A Team crest is an official item render on a palette field. The items are a fixed, reviewed
 * set from the pinned catalog (tests/team-crest.test.ts checks every id and name against
 * data/catalog), so the server never has to reach the catalog to validate a choice. Uploaded
 * images would need storage and moderation; they are not offered.
 */
export const crestItems = [
  ["Weapons", "T8_2H_CLAYMORE", "Elder's Claymore"],
  ["Weapons", "T8_MAIN_SWORD", "Elder's Broadsword"],
  ["Weapons", "T8_2H_HAMMER", "Elder's Great Hammer"],
  ["Weapons", "T8_MAIN_MACE", "Elder's Mace"],
  ["Weapons", "T8_2H_SPEAR", "Elder's Pike"],
  ["Weapons", "T8_MAIN_DAGGER", "Elder's Dagger"],
  ["Weapons", "T8_2H_QUARTERSTAFF", "Elder's Quarterstaff"],
  ["Weapons", "T8_2H_BOW", "Elder's Bow"],
  ["Weapons", "T8_2H_CROSSBOW", "Elder's Crossbow"],
  ["Weapons", "T8_MAIN_FIRESTAFF", "Elder's Fire Staff"],
  ["Weapons", "T8_MAIN_FROSTSTAFF", "Elder's Frost Staff"],
  ["Weapons", "T8_MAIN_ARCANESTAFF", "Elder's Arcane Staff"],
  ["Weapons", "T8_MAIN_CURSEDSTAFF", "Elder's Cursed Staff"],
  ["Weapons", "T8_MAIN_HOLYSTAFF", "Elder's Holy Staff"],
  ["Weapons", "T8_MAIN_NATURESTAFF", "Elder's Nature Staff"],
  ["Shields and helmets", "T8_OFF_SHIELD", "Elder's Shield"],
  ["Shields and helmets", "T8_OFF_TOWERSHIELD_UNDEAD", "Elder's Sarcophagus"],
  ["Shields and helmets", "T8_OFF_TORCH", "Elder's Torch"],
  ["Shields and helmets", "T8_OFF_HORN_KEEPER", "Elder's Mistcaller"],
  ["Shields and helmets", "T8_HEAD_PLATE_SET2", "Elder's Knight Helmet"],
  ["Shields and helmets", "T8_HEAD_PLATE_ROYAL", "Elder's Royal Helmet"],
  ["Shields and helmets", "T8_HEAD_LEATHER_SET3", "Elder's Assassin Hood"],
  ["Shields and helmets", "T8_HEAD_CLOTH_ROYAL", "Elder's Royal Cowl"],
  ["Capes", "T8_CAPEITEM_FW_BRIDGEWATCH", "Elder's Bridgewatch Cape"],
  ["Capes", "T8_CAPEITEM_FW_MARTLOCK", "Elder's Martlock Cape"],
  ["Capes", "T8_CAPEITEM_FW_THETFORD", "Elder's Thetford Cape"],
  ["Capes", "T8_CAPEITEM_FW_LYMHURST", "Elder's Lymhurst Cape"],
  ["Capes", "T8_CAPEITEM_FW_FORTSTERLING", "Elder's Fort Sterling Cape"],
  ["Capes", "T8_CAPEITEM_FW_CAERLEON", "Elder's Caerleon Cape"],
  ["Capes", "T8_CAPEITEM_FW_BRECILIEN", "Elder's Brecilien Cape"],
  ["Capes", "T8_CAPEITEM_DEMON", "Elder's Demon Cape"],
  ["Capes", "T8_CAPEITEM_UNDEAD", "Elder's Undead Cape"],
  ["Capes", "T8_CAPEITEM_AVALON", "Elder's Avalonian Cape"],
  ["Mounts", "T8_MOUNT_ARMORED_HORSE", "Elder's Armored Horse"],
  ["Mounts", "T6_MOUNT_DIREWOLF", "Direwolf"],
  ["Mounts", "T8_MOUNT_DIREBEAR", "Saddled Direbear"],
  ["Mounts", "T7_MOUNT_SWAMPDRAGON", "Saddled Swamp Dragon"],
  ["Mounts", "T8_MOUNT_MAMMOTH_TRANSPORT", "Elder's Transport Mammoth"],
  ["Mounts", "T8_MOUNT_SPIDER_HELL", "Soulspinner"],
  ["Mounts", "T8_MOUNT_OWL_FW_BRECILIEN_ELITE", "Elite Mystic Owl"],
] as const;
export type CrestItem = (typeof crestItems)[number][1];
const crestItemIds = crestItems.map(([, id]) => id) as [CrestItem, ...CrestItem[]];

/** Field colours, each drawn from a site token (teams.module.css maps them). */
export const crestColors = [
  "ember",
  "gold",
  "crimson",
  "forest",
  "teal",
  "azure",
  "violet",
  "steel",
] as const;
export type CrestColor = (typeof crestColors)[number];

/** The monogram's field when no crest is chosen: stable for a name, so it never flickers. */
export function defaultCrestColor(name: string): CrestColor {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return crestColors[hash % crestColors.length];
}
export const resolveCrestColor = (name: string, color?: string | null): CrestColor =>
  crestColors.includes(color as CrestColor) ? (color as CrestColor) : defaultCrestColor(name);
export const crestItemName = (id?: string | null) =>
  crestItems.find(([, item]) => item === id)?.[2];

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

/** The crest, activities and recruiting fields shared by creating a team and editing its profile. */
export const teamIdentity = {
  crestItem: z.enum(crestItemIds).nullable().default(null),
  crestColor: z.enum(crestColors).nullable().default(null),
  activities: z
    .array(z.enum(teamActivities))
    .max(3)
    .refine((list) => new Set(list).size === list.length, "Choose each activity once")
    .default([])
    .transform(encodeActivities),
  recruiting: z.boolean().default(true),
};
