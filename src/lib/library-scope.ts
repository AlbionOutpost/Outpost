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
 * Titles a player gave a scratch or test copy ("test ss", "testedeclap", "TestingB", "prueba").
 * A word that starts with one of these markers counts; "Contest" or "Attestation" do not.
 */
const scratchTitle = /(^|[^\p{L}])(test|prueba|asdf|qwer|untitled|copy of)/iu;
export const testLikeTitle = (title?: string) => scratchTitle.test(title ?? "");
/**
 * Which archived builds search engines may index: any build at least one player liked, listed or
 * not (a liked 2025 build is still a real, vetted page), unless its title marks a test copy.
 * Unliked builds are mostly scratch copies and stay noindex and out of the sitemap; their pages
 * still work for the comps that link them. Every liked build records a weapon and six to eight
 * gear slots (checked 11 Nov 2026), so its page has real content.
 */
export const indexedBuild = (b: { upvotes?: number; title?: string }) =>
  (b.upvotes ?? 0) >= 1 && !testLikeTitle(b.title);
/** A comp description is real when it explains the comp: at least 40 characters and 6 words. */
export const COMP_DESCRIPTION_CHARS = 40;
export const COMP_DESCRIPTION_WORDS = 6;
const realDescription = (text?: string) => {
  const words = (text ?? "")
    .replace(/[#*_>`~|➤-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.join(" ").length >= COMP_DESCRIPTION_CHARS && words.length >= COMP_DESCRIPTION_WORDS;
};
/**
 * Which archived comps search engines may index. A comp page is mostly its member list, so it
 * needs the author's own words to be worth a search result: at least one like, a real
 * description, a title with at least three letters that does not mark a test copy, and at least
 * two members. The rest (639 of 682 on 11 Nov 2026) render `noindex, follow` and stay out of the
 * sitemap; their pages keep working for players.
 */
export const indexedComposition = (c: {
  title?: string;
  description?: string;
  upvotes?: number;
  members?: readonly unknown[];
}) =>
  (c.upvotes ?? 0) >= 1 &&
  realDescription(c.description) &&
  (c.title ?? "").replace(/[^\p{L}]/gu, "").length >= 3 &&
  !testLikeTitle(c.title) &&
  (c.members?.length ?? 0) >= 2;
