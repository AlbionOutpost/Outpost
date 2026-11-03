// Owner-supplied category artwork; provenance: docs/assets/ACTIVITY_BACKGROUNDS.json.
export const activityBackgrounds = [
  {
    id: "MISTS_SOLO",
    name: "Solo Mists",
    src: "/albion/activities/mists-solo.webp",
  },
  {
    id: "MISTS_DUO",
    name: "Duo Mists",
    src: "/albion/activities/mists-duo.webp",
  },
  {
    id: "CORRUPTED_DUNGEON",
    name: "Corrupted Dungeons",
    src: "/albion/activities/corrupted-dungeon.webp",
  },
  {
    id: "ABYSSAL_DEPTHS_2V2",
    name: "Abyssal Depths 2v2",
    src: "/albion/activities/abyssal-depths-2v2.webp",
  },
  {
    id: "ABYSSAL_DEPTHS_3V3",
    name: "Abyssal Depths 3v3",
    src: "/albion/activities/abyssal-depths-3v3.webp",
  },
  {
    id: "HELLGATE_2V2",
    name: "Hellgates 2v2",
    src: "/albion/activities/hellgate-2v2.webp",
  },
  {
    id: "HELLGATE_5V5",
    name: "Hellgates 5v5",
    src: "/albion/activities/hellgate-5v5.webp",
  },
  {
    id: "HELLGATE_10V10",
    name: "Hellgates 10v10",
    src: "/albion/activities/hellgate-10v10.webp",
  },
  {
    id: "SMALL_SCALE",
    name: "Small Scale",
    src: "/albion/activities/small-scale.webp",
  },
  {
    id: "ZVZ",
    name: "ZvZ",
    src: "/albion/activities/zvz.webp",
  },
  {
    id: "BOMB_SQUAD",
    name: "Bomb Squad",
    src: "/albion/activities/bomb-squad.webp",
  },
  {
    id: "OPEN_WORLD",
    name: "Open World / Roaming",
    src: "/albion/activities/open-world.webp",
  },
  {
    id: "GANK_SOLO",
    name: "Solo Ganking",
    src: "/albion/activities/gank-solo.webp",
  },
  {
    id: "GANK_DUO",
    name: "Duo Ganking",
    src: "/albion/activities/gank-duo.webp",
  },
  {
    id: "GANK_GROUP",
    name: "Group Ganking",
    src: "/albion/activities/gank-group.webp",
  },
  {
    id: "FACTION_WARFARE",
    name: "Faction Warfare",
    src: "/albion/activities/faction-warfare.webp",
  },
  {
    id: "ARENA",
    name: "Arena",
    src: "/albion/activities/arena.webp",
  },
  {
    id: "CRYSTAL_ARENA",
    name: "Crystal Arena",
    src: "/albion/activities/crystal-arena.webp",
  },
  {
    id: "CRYSTAL_ARENA_1V1",
    name: "Crystal Arena 1v1",
    src: "/albion/activities/crystal-arena-1v1.webp",
  },
  {
    id: "FAME_FARM_SOLO",
    name: "Solo PvE / Fame Farming",
    src: "/albion/activities/fame-farm-solo.webp",
  },
  {
    id: "FAME_FARM_GROUP",
    name: "Group PvE / Fame Farming",
    src: "/albion/activities/fame-farm-group.webp",
  },
  {
    id: "GROUP_DUNGEON",
    name: "Group Dungeons",
    src: "/albion/activities/group-dungeon.webp",
  },
  {
    id: "FAME_FARM_GROUP_AVALON",
    name: "Avalonian Dungeons",
    src: "/albion/activities/fame-farm-group-avalon.webp",
  },
  {
    id: "HCE",
    name: "HCE",
    src: "/albion/activities/hce.webp",
  },
  {
    id: "WORLD_BOSS",
    name: "World Boss",
    src: "/albion/activities/world-boss.webp",
  },
  {
    id: "ANCIENT_LANDS",
    name: "Ancient Lands",
    src: "/albion/activities/ancient-lands.webp",
  },
  {
    id: "CRYSTAL_CREATURES",
    name: "Crystal Creatures",
    src: "/albion/activities/crystal-creatures.webp",
  },
  {
    id: "TRACKING_SOLO",
    name: "Solo Tracking",
    src: "/albion/activities/tracking-solo.webp",
  },
  {
    id: "TRACKING_GROUP",
    name: "Group Tracking",
    src: "/albion/activities/tracking-group.webp",
  },
  {
    id: "GATHERING",
    name: "Gathering",
    src: "/albion/activities/gathering.webp",
  },
  {
    id: "TRANSPORTING",
    name: "Transporting",
    src: "/albion/activities/transporting.webp",
  },
  {
    id: "OFF_META",
    name: "Off Meta",
    src: "/albion/activities/off-meta.webp",
  },
] as const;

/** Match only recorded category IDs/names and unambiguous editor labels. */
export function activityBackgroundFor(category: string) {
  const aliases: Record<string, string> = {
    "Open World": "OPEN_WORLD",
    "Solo PvE": "FAME_FARM_SOLO",
    "Group PvE": "FAME_FARM_GROUP",
    Roaming: "OPEN_WORLD",
    "Small Scale PvP": "SMALL_SCALE",
  };
  return activityBackgrounds.find(
    (art) =>
      art.id === (aliases[category] || category) ||
      art.name.toLowerCase() === category.toLowerCase(),
  );
}
