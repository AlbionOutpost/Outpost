/** Search normalisation and ranking shared by global search; pure so it can be tested. */
export function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9.@]+/g, " ")
    .trim();
}
export function terms(query: string) {
  const words = normalize(query).split(" ").filter(Boolean);
  return { words, compact: words.join("") };
}
/**
 * 0 = no match. Exact > space-insensitive exact > prefix > word prefix > contains.
 * "battle axe" matches "Battleaxe" through the compact form.
 */
export function matchScore(text: string, query: string) {
  const { words, compact } = terms(query);
  if (!words.length) return 0;
  const value = normalize(text);
  const squashed = value.replace(/ /g, "");
  const phrase = words.join(" ");
  if (value === phrase) return 100;
  if (squashed === compact) return 95;
  if (value.startsWith(phrase)) return 80;
  const valueWords = value.split(" ");
  if (words.every((w) => valueWords.some((v) => v.startsWith(w)))) return 60;
  if (squashed.includes(compact)) return 45;
  if (words.every((w) => value.includes(w))) return 30;
  return 0;
}
const tierPrefix = /^(beginners|novices|journeymans|adepts|experts|masters|grandmasters|elders)\s+/;
/** "Adept's Battleaxe" → "Battleaxe" so tiers of one item collapse into a single result. */
export function familyName(name: string) {
  return name
    .replace(/\s*·\s*\.\d$/, "")
    .replace(/^(Beginner|Novice|Journeyman|Adept|Expert|Master|Grandmaster|Elder)'s\s+/, "");
}
export function familyScore(name: string, query: string) {
  return Math.max(matchScore(familyName(name), query), matchScore(name, query) - 5);
}
export const isTierWord = (word: string) => tierPrefix.test(`${word} `);
