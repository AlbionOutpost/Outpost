// What the homepage shows is chosen here and read from the public library or live observations;
// nothing is staged. The build fills eight of the board's ten wells (no public build records a
// bag or mount), the comp is a five-member party, the planner plan is an example priced live.
// `/api/landing` prices exactly this market item and plan, so the page and the API agree.
export const landingShowcase = {
  build: "battleaxe-mist-build",
  comp: "hellgate-5v5-front-to-back",
  market: { id: "T6_METALBAR", kind: "Refined material · Tier 6", quality: 1 },
  plan: [
    { itemId: "T4_CAPE", slot: "Cape", qty: 10 },
    { itemId: "T6_MAIN_SWORD", slot: "Main hand", qty: 3 },
    { itemId: "T6_POTION_HEAL", slot: "Potion", qty: 20 },
  ],
} as const;

/** The city the market card charts when no city has a sell order. */
export const LANDING_HISTORY_FALLBACK_CITY = "Bridgewatch";
