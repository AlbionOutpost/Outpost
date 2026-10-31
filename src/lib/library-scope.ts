/**
 * Which archived builds the library lists: builds updated in 2026 that at least one player
 * liked. Older or unliked builds stay stored because group comps reference them, but they are
 * not listed, counted or offered in search. Everything listed is ranked by likes.
 */
export const LISTED_SINCE = "2026";
export const listedBuild = (b: { updatedAt?: string; upvotes?: number }) =>
  (b.updatedAt ?? "") >= LISTED_SINCE && (b.upvotes ?? 0) >= 1;
export const byLikes = <T extends { upvotes?: number }>(a: T, b: T) =>
  (b.upvotes ?? 0) - (a.upvotes ?? 0);
