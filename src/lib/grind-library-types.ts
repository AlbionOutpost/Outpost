export type LibraryEquipment = {
  slot: string;
  itemId: string;
  skills: string[];
  alternatives: string[];
  alternativeSkills: Record<string, string[]>;
};
export type LibraryBuild = {
  id: string;
  slug: string;
  sourceSlug: string;
  title: string;
  author: string;
  category: string;
  description: string;
  updatedAt: string;
  weaponName: string;
  equipment: LibraryEquipment[];
  tags: string[];
  recommendedTraits: string[];
  videos: { kind: "video" | "channel"; id: string; url: string }[];
  unresolvedVideoReferences: number;
  /** Public upvotes recorded in the owner's archive export; absent when not imported. */
  upvotes?: number;
};
export type AwakeningTrait = {
  id: string;
  name: string;
  rarity: string;
  range: string;
  weapons: string;
};
export type LibraryComposition = {
  slug: string;
  title: string;
  author: string;
  category: string;
  description: string;
  updatedAt: string;
  members: string[];
  optional: string[];
  /** Public upvotes recorded in the owner's archive export; absent when not imported. */
  upvotes?: number;
};
export type GuideNode =
  | string
  | {
      tag: string;
      href?: string;
      id?: string;
      children: GuideNode[];
      src?: string;
      alt?: string;
      width?: number;
      height?: number;
    };
export type LibraryGuide = {
  slug: string;
  title: string;
  author: string;
  category: string;
  updatedAt: string;
  summary: string;
  toc: { title: string; id: string }[];
  content: GuideNode[];
  cover: { src: string; width: number; height: number } | null;
  interactiveContentRestored: boolean;
};
export function activityName(category: string) {
  const names: Record<string, string> = {
    ZVZ: "ZvZ",
    MISTS_SOLO: "Solo Mists",
    MISTS_DUO: "Duo Mists",
    FAME_FARM_SOLO: "Solo PvE",
    FAME_FARM_GROUP: "Group PvE",
    FAME_FARM_GROUP_AVALON: "Avalonian Dungeons",
    CORRUPTED_DUNGEON: "Corrupted Dungeons",
    OPEN_WORLD: "Open World",
    HCE: "HCE",
    SMALL_SCALE: "Small scale",
    GANK_SOLO: "Solo ganking",
    GANK_GROUP: "Group ganking",
  };
  return (
    names[category] ||
    category
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/^./, (c) => c.toUpperCase())
  );
}
