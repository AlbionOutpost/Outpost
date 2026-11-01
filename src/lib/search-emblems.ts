/**
 * The painted emblem shown beside a search result that has no item render of its own: tools
 * by what they do, comps, builds and Teams by kind. Files live in public/albion/icons.
 */
const toolEmblems: Record<string, string> = {
  market: "tool-market",
  trade: "tool-market",
  history: "tool-market",
  transport: "tool-planner",
  timer: "tool-planner",
  map: "tool-planner",
  combat: "kill-skull",
  composition: "strip-comps",
  equipment: "strip-builds",
  builds: "strip-builds",
  guild: "team-roles",
  catalog: "strip-content",
  reference: "strip-content",
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
