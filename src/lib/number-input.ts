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
  /**
   * The plain number, or null while the field is empty, holds only "-", a fraction in progress, or
   * (committed) something it cannot read without guessing: then the text stays and the field is invalid.
   */
  value: number | null;
};

const suffixes = { k: 3, m: 6, b: 9 } as const;
/** Digits beyond this lose precision as a JavaScript number. */
const maxIntegerDigits = 15;
/** How many fraction digits a whole-silver field holds while shorthand is typed ("1.25" → "1.25m"). */
const shorthandDigits = 9;

/**
 * Decimal commas, the European way, without breaking the grouped text this field writes itself.
 * Both marks: the last one is the decimal point ("1.234,56", "1,234.56"). Several dots: grouping
 * ("1.250.000"). A single comma followed by one or two digits is a decimal point in a field that
 * takes fractions ("12,5" %) unless the field was already showing grouped text. Length is kept, so
 * the caret maps across.
 */
export function normalizeMarks(raw: string, rules: NumberRules = {}, previous = "") {
  const commas = raw.split(",").length - 1,
    dots = raw.split(".").length - 1;
  if (commas && dots) {
    const last = Math.max(raw.lastIndexOf(","), raw.lastIndexOf("."));
    return [...raw].map((c, i) => (c === "," || c === "." ? (i === last ? "." : ",") : c)).join("");
  }
  if (dots > 1) return raw.replaceAll(".", ",");
  if (
    commas === 1 &&
    (rules.decimals ?? 0) > 0 &&
    !previous.includes(",") &&
    /,\d{1,2}$/.test(raw.trim())
  )
    return raw.replace(",", ".");
  return raw;
}

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
  /** What the field showed before this keystroke: grouped text means its commas are grouping. */
  previous = "",
): NumberText {
  const decimals = rules.decimals ?? 0;
  let source = raw.trim().replace(/[\s_']/g, "");
  const sign = rules.negative && source.startsWith("-") ? "-" : "";
  let power = 0;
  if (rules.silver) {
    const match = /^-?([\d.,]*\d[\d.,]*)([kmb])$/i.exec(source);
    if (match) {
      // "1,5m" is 1.5 million; "1,250k" is grouping.
      source = /^\d+,\d{1,2}$/.test(match[1]) ? match[1].replace(",", ".") : match[1];
      power = suffixes[match[2].toLowerCase() as keyof typeof suffixes];
    } else if (decimals === 0 && !previous.includes(",") && /^-?\d+,\d{1,2}$/.test(source)) {
      // "1,5" may be shorthand on its way ("1,5m") or grouping still being typed ("1,250"): wait.
      return { text: `${sign}${source.replace(/^-/, "")}`, value: null };
    }
  }
  source = normalizeMarks(source, rules, previous).replace(/,/g, "");
  // Digits and the first point only.
  const cleaned = source.replace(/[^\d.]/g, "");
  const point = cleaned.indexOf(".");
  let int = (point >= 0 ? cleaned.slice(0, point) : cleaned).replace(/^0+(?=\d)/, "");
  let frac = point >= 0 ? cleaned.slice(point + 1).replace(/\./g, "") : undefined;
  if (power) {
    // 1.2m: move the point six places as text, so no float error creeps in; the suffix finishes it.
    const digits = (frac ?? "").padEnd(power, "0");
    int = `${int}${digits.slice(0, power)}`.replace(/^0+(?=\d)/, "");
    // Too large to hold exactly: say so rather than drop digits and the magnitude with them.
    if (int.length > maxIntegerDigits) return { text: raw.trim(), value: null };
    return finish(Number(`${sign}${int || "0"}.${digits.slice(power) || "0"}`), decimals);
  }
  if (int.length > maxIntegerDigits) return { text: `${sign}${group(int)}`, value: null };
  const pending = decimals === 0 && rules.silver;
  if (frac !== undefined) {
    if (decimals === 0 && !pending) frac = undefined;
    else frac = frac.slice(0, pending ? shorthandDigits : decimals);
  }
  if (!int && frac === undefined) return { text: sign, value: null };
  const value = Number(`${sign}${int || "0"}.${frac || "0"}`);
  const text = `${sign}${group(int || "0")}${frac !== undefined ? `.${frac}` : ""}`;
  // A fraction typed into a whole-silver field is shorthand in progress: no value until k/m/b,
  // and still none when the player leaves it, so "1.5" is never quietly read as 2 silver.
  if (pending && frac) return { text, value: null };
  if (committed) return finish(value, decimals);
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
