/**
 * The painted emblem shown beside a search result that has no item render of its own: tools
 * by what they do, comps, builds and Teams by kind. Files live in public/albion/icons.
 */
const toolEmblems: Record<string, string> = {
  market: "tool-market",
  trade: "silver",
  history: "tool-gold",
  transport: "tool-transport",
  timer: "team-calendar",
  map: "tool-avalon",
  farm: "tool-farming",
  fish: "tool-fishing",
  labor: "team-loot",
  mastery: "tool-mastery",
  combat: "kill-skull",
  composition: "strip-comps",
  equipment: "strip-builds",
  builds: "strip-builds",
  guild: "team-roles",
  catalog: "tool-items",
  reference: "tool-reference",
  account: "team-roles",
  calculator: "tool-craft",
  craft: "tool-craft",
  cook: "tool-cooking",
  alchemy: "tool-alchemy",
  guides: "tool-reference",
  refine: "tool-refining",
  enchant: "tool-enchanting",
};
export const toolEmblem = (icon: string) => toolEmblems[icon] ?? "tool-craft";
export const kindEmblem = {
  Builds: "strip-builds",
  Compositions: "strip-comps",
  Groups: "team-roles",
  Guides: "strip-content",
  Tools: "tool-craft",
} as const;
