/**
 * Display names: what a player calls themselves, as other players see it.
 *
 * `cleanDisplayName` removes characters that hide or reorder text (bidi overrides and isolates,
 * zero-width characters, every other format and control character, and the blank letters that
 * render as nothing) and collapses whitespace. `reservedDisplayName` catches names that pass for
 * Outpost or its staff, ignoring case, accents, spacing, punctuation and look-alike letters.
 * Names are checked when a player signs up or changes theirs; stored names are not rewritten, and
 * `displayName` applies both rules whenever a name is shown.
 */

/** Format (Cf) and control (Cc) characters, plus letters and symbols that render blank. */
const invisible = /[\p{Cf}\p{Cc}\u115F\u1160\u3164\uFFA0\u2800\u034F\u180B-\u180D]/gu;

export function cleanDisplayName(name: string | null | undefined) {
  return (name ?? "")
    .replace(/[\u2028\u2029]/g, " ")
    .replace(invisible, "")
    .replace(/[\s\p{Z}]+/gu, " ")
    .trim();
}

/** Look-alike letters and digits, folded to the Latin letter they imitate. */
const lookalikes: Record<string, string> = {
  "0": "o",
  "1": "l",
  "!": "l",
  "|": "l",
  i: "l",
  "3": "e",
  "4": "a",
  "@": "a",
  "5": "s",
  $: "s",
  "7": "t",
  "+": "t",
  "8": "b",
  "9": "g",
  // Cyrillic
  а: "a",
  в: "b",
  е: "e",
  ё: "e",
  к: "k",
  м: "m",
  н: "h",
  о: "o",
  р: "p",
  с: "c",
  т: "t",
  у: "y",
  х: "x",
  і: "l",
  ї: "l",
  ј: "j",
  ѕ: "s",
  ԁ: "d",
  ԛ: "q",
  ԝ: "w",
  // Greek
  α: "a",
  β: "b",
  ε: "e",
  η: "n",
  ι: "l",
  κ: "k",
  μ: "u",
  ν: "v",
  ο: "o",
  ρ: "p",
  τ: "t",
  υ: "u",
  χ: "x",
  // Latin look-alikes
  ı: "l",
  ł: "l",
  ɑ: "a",
  ɡ: "g",
  ɩ: "l",
  ʀ: "r",
  ꜱ: "s",
};

/** A name folded to plain Latin letters, so look-alikes compare equal. */
function skeleton(text: string) {
  const folded = [...cleanDisplayName(text).normalize("NFKD").toLowerCase()]
    .map((c) => lookalikes[c] ?? c)
    .join("")
    .replace(/\p{M}/gu, "");
  return folded.replace(/rn/g, "m").replace(/vv/g, "w");
}
const letters = (text: string) => skeleton(text).replace(/[^a-z]/g, "");

/** Whole names that belong to Outpost or read as its staff. */
const reservedNames = new Set(
  [
    "Outpost",
    "Albion Outpost",
    "Outpost staff",
    "Outpost team",
    "Outpost admin",
    "Outpost support",
    "Outpost official",
    "Outpost moderator",
    "Outpost mod",
    "admin",
    "administrator",
    "moderator",
    "mod",
    "official",
    "support",
    "system",
    "staff",
  ].map(letters),
);
/** Words that read as Outpost or its staff anywhere in a name ("Admin Kara", "Outpost Bot"). */
const reservedWords = new Set(["outpost", "admin", "administrator", "moderator"].map(letters));

export function reservedDisplayName(name: string | null | undefined) {
  const whole = letters(name ?? "");
  if (!whole) return false;
  if (reservedNames.has(whole)) return true;
  return skeleton(name ?? "")
    .split(/[^a-z]+/)
    .some((word) => word && reservedWords.has(word));
}

/** What to show for a name: cleaned, or "Adventurer" when empty or reserved. */
export function displayName(name: string | null | undefined, fallback = "Adventurer") {
  const clean = cleanDisplayName(name);
  return clean && !reservedDisplayName(clean) ? clean : fallback;
}
