/** What the giveaway pages show; no validation library, so the client bundle stays small. */

/** Said beside every giveaway: who hands the prize over, and that nothing is bought. */
export const prizeLine =
  "Free to enter. The prize is handed over in game by whoever runs the giveaway; Outpost sells nothing and holds no prize.";

/** Painted emblems a giveaway can show (public/albion/icons/<name>.webp), or none. */
export const giveawayImages = [
  "trophy-gold",
  "trophy-silver",
  "trophy-bronze",
  "silver",
  "fame",
  "team-loot",
] as const;
export type GiveawayImage = (typeof giveawayImages)[number];
export const giveawayImageLabels: Record<GiveawayImage, string> = {
  "trophy-gold": "Gold trophy",
  "trophy-silver": "Silver trophy",
  "trophy-bronze": "Bronze trophy",
  silver: "Silver",
  fame: "Fame",
  "team-loot": "Loot chest",
};

export const maxWinners = 50;

export type GiveawayStatus = "OPEN" | "CANCELLED" | "DRAWN";
/** Where a giveaway stands for a player right now. */
export function phaseOf(g: { status: string; closesAt: string | Date }, now = Date.now()) {
  if (g.status === "DRAWN") return "drawn" as const;
  if (g.status === "CANCELLED") return "cancelled" as const;
  return new Date(g.closesAt).getTime() > now ? ("open" as const) : ("closed" as const);
}
