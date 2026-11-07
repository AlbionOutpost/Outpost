/**
 * Typing numbers: what `NumberField` shows while a player types, and the plain number behind it.
 * The text carries thousands separators ("1,250,000"), loses leading zeros, keeps at most
 * `decimals` fraction digits, and on silver fields turns a k / m / b suffix into the whole number
 * ("1.2m" → 1,200,000). The number is never formatted: it is what gets stored and sent.
 */
export type NumberRules = {
  /** Fraction digits allowed; 0 (the default) means whole numbers only. */
  decimals?: number;
  /** Accept the silver shorthand: 500k, 25m, 1.2m, 2b. */
  silver?: boolean;
  /** Allow a leading minus sign. */
  negative?: boolean;
};

export type NumberText = {
  /** What the field shows. */
  text: string;
  /** The plain number, or null while the field is empty or holds only "-" or a fraction in progress. */
  value: number | null;
};

const suffixes = { k: 3, m: 6, b: 9 } as const;
/** Digits beyond this lose precision as a JavaScript number. */
const maxIntegerDigits = 15;
/** How many fraction digits a whole-silver field holds while shorthand is typed ("1.25" → "1.25m"). */
const shorthandDigits = 9;

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** A number as the field shows it: grouped, at most `decimals` fraction digits, never exponent. */
export function formatNumberText(value: number | null | undefined, decimals = 0) {
  if (value == null || !Number.isFinite(value)) return "";
  const fixed = Math.abs(value).toFixed(Math.min(Math.max(decimals, 0), 20));
  const [int, frac = ""] = fixed.split(".");
  const trimmed = frac.replace(/0+$/, "");
  const negative = value < 0 && (Number(int) > 0 || !!trimmed);
  return `${negative ? "-" : ""}${group(int)}${trimmed ? `.${trimmed}` : ""}`;
}

const finish = (value: number, decimals: number): NumberText => {
  const rounded = Number(value.toFixed(decimals)) || 0; // `|| 0` also turns -0 into 0
  return { text: formatNumberText(rounded, decimals), value: rounded };
};

/**
 * Clean what a player typed into the field's text and value. `committed` (on blur) also drops a
 * trailing point and rounds a fraction past the allowed digits.
 */
export function readNumberText(
  raw: string,
  rules: NumberRules = {},
  committed = false,
): NumberText {
  const decimals = rules.decimals ?? 0;
  let source = raw.trim().replace(/[\s,_']/g, "");
  const sign = rules.negative && source.startsWith("-") ? "-" : "";
  let power = 0;
  if (rules.silver) {
    const match = /^-?([\d.]*\d[\d.]*)([kmb])$/i.exec(source);
    if (match) {
      source = match[1];
      power = suffixes[match[2].toLowerCase() as keyof typeof suffixes];
    }
  }
  // Digits and the first point only.
  const cleaned = source.replace(/[^\d.]/g, "");
  const point = cleaned.indexOf(".");
  let int = (point >= 0 ? cleaned.slice(0, point) : cleaned).replace(/^0+(?=\d)/, "");
  let frac = point >= 0 ? cleaned.slice(point + 1).replace(/\./g, "") : undefined;
  if (power) {
    // 1.2m: move the point six places as text, so no float error creeps in; the suffix finishes it.
    const digits = (frac ?? "").padEnd(power, "0");
    int = `${int}${digits.slice(0, power)}`.replace(/^0+(?=\d)/, "").slice(0, maxIntegerDigits);
    return finish(Number(`${sign}${int || "0"}.${digits.slice(power) || "0"}`), decimals);
  }
  int = int.slice(0, maxIntegerDigits);
  const pending = decimals === 0 && rules.silver;
  if (frac !== undefined) {
    if (decimals === 0 && !pending) frac = undefined;
    else frac = frac.slice(0, pending ? shorthandDigits : decimals);
  }
  if (!int && frac === undefined) return { text: sign, value: null };
  const value = Number(`${sign}${int || "0"}.${frac || "0"}`);
  if (committed) return finish(value, decimals);
  const text = `${sign}${group(int || "0")}${frac !== undefined ? `.${frac}` : ""}`;
  // A fraction typed into a whole-silver field is shorthand in progress: no value until k/m/b.
  if (pending && frac) return { text, value: null };
  return { text, value: value || 0 };
}

/** Characters that carry meaning (digits, point, sign); separators are re-made on every key. */
const significant = /[\d.-]/;

/** Where the caret goes in the new text: after the same count of meaningful characters. */
export function caretAfter(raw: string, caret: number, text: string) {
  let count = 0;
  for (let i = 0; i < caret && i < raw.length; i++) if (significant.test(raw[i])) count++;
  if (!count) return 0;
  for (let i = 0; i < text.length; i++) {
    if (significant.test(text[i])) count--;
    if (!count) return i + 1;
  }
  return text.length;
}

/** Clamp to optional bounds. */
export function clampNumber(value: number, min?: number, max?: number) {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}
