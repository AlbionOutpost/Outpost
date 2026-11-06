/**
 * The painted emblem shown beside a search result that has no item render of its own: tools
 * by what they do, comps, builds and Teams by kind. Files live in public/albion/icons.
 */
const toolEmblems: Record<string, string> = {
  market: "tool-market",
  trade: "silver",
  history: "tool-market",
  transport: "tool-market",
  timer: "team-calendar",
  map: "tool-planner",
  farm: "team-calendar",
  fish: "silver",
  labor: "team-loot",
  mastery: "tool-craft",
  combat: "kill-skull",
  composition: "strip-comps",
  equipment: "strip-builds",
  builds: "strip-builds",
  guild: "team-roles",
  catalog: "tool-planner",
  reference: "tool-planner",
  account: "team-roles",
  calculator: "tool-craft",
};
export const toolEmblem = (icon: string) => toolEmblems[icon] ?? "tool-craft";
export const kindEmblem = {
  Builds: "strip-builds",
  Compositions: "strip-comps",
  Groups: "team-roles",
  Guides: "strip-content",
  Tools: "tool-craft",
} as const;
