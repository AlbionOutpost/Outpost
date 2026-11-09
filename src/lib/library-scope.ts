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
/**
 * Which archived builds search engines may index: any build at least one player liked, listed or
 * not (a liked 2025 build is still a real, vetted page). Unliked builds are mostly scratch copies
 * and stay noindex and out of the sitemap; their pages still work for the comps that link them.
 */
export const indexedBuild = (b: { upvotes?: number }) => (b.upvotes ?? 0) >= 1;
