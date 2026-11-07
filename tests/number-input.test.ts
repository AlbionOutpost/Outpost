import { describe, expect, it } from "vitest";
import { caretAfter, formatNumberText, readNumberText } from "@/lib/number-input";

describe("number field text", () => {
  it("groups thousands and keeps the plain number", () => {
    expect(readNumberText("1250000")).toEqual({ text: "1,250,000", value: 1250000 });
    expect(readNumberText("1,250,0001")).toEqual({ text: "12,500,001", value: 12500001 });
  });
  it("drops leading zeros", () => {
    expect(readNumberText("025345345")).toEqual({ text: "25,345,345", value: 25345345 });
    expect(readNumberText("000")).toEqual({ text: "0", value: 0 });
    expect(readNumberText("00.5", { decimals: 1 })).toEqual({ text: "0.5", value: 0.5 });
  });
  it("reads empty as missing, never as 0", () => {
    expect(readNumberText("")).toEqual({ text: "", value: null });
    expect(readNumberText("abc")).toEqual({ text: "", value: null });
  });
  it("keeps decimals only where allowed", () => {
    // A pasted fraction in a whole-number field keeps the whole part.
    expect(readNumberText("12.5")).toEqual({ text: "12", value: 12 });
    expect(readNumberText("12.345", { decimals: 2 })).toEqual({ text: "12.34", value: 12.34 });
    expect(readNumberText("12.", { decimals: 1 })).toEqual({ text: "12.", value: 12 });
    expect(readNumberText("12.", { decimals: 1 }, true)).toEqual({ text: "12", value: 12 });
  });
  it("takes silver shorthand on silver fields only", () => {
    expect(readNumberText("25m", { silver: true })).toEqual({ text: "25,000,000", value: 25e6 });
    expect(readNumberText("1.2m", { silver: true })).toEqual({ text: "1,200,000", value: 1.2e6 });
    expect(readNumberText("500K", { silver: true })).toEqual({ text: "500,000", value: 5e5 });
    expect(readNumberText("2b", { silver: true })).toEqual({ text: "2,000,000,000", value: 2e9 });
    expect(readNumberText("1.15m", { silver: true }).value).toBe(1150000);
    expect(readNumberText("1.2345k", { silver: true }).value).toBe(1235);
    expect(readNumberText("25m")).toEqual({ text: "25", value: 25 });
  });
  it("holds a whole-silver fraction as shorthand in progress", () => {
    expect(readNumberText("1.2", { silver: true })).toEqual({ text: "1.2", value: null });
    expect(readNumberText("1.6", { silver: true }, true)).toEqual({ text: "2", value: 2 });
  });
  it("allows a sign only for negative ranges", () => {
    expect(readNumberText("-5")).toEqual({ text: "5", value: 5 });
    expect(readNumberText("-5", { negative: true })).toEqual({ text: "-5", value: -5 });
    expect(readNumberText("-", { negative: true })).toEqual({ text: "-", value: null });
  });
  it("formats numbers without exponents or float noise", () => {
    expect(formatNumberText(1e12)).toBe("1,000,000,000,000");
    expect(formatNumberText(0.1 + 0.2, 2)).toBe("0.3");
    expect(formatNumberText(NaN)).toBe("");
    expect(formatNumberText(null)).toBe("");
  });
  it("keeps the caret after the same digit when separators move", () => {
    // Typing a 4th digit at the end: "125|" + "0" → "1,250|"
    expect(caretAfter("1250", 4, "1,250")).toBe(5);
    // Inserting in the middle: "1,2|50" + "9" → raw "1,29|50" → "12,9|50"
    expect(caretAfter("1,2950", 4, "12,950")).toBe(4);
    // Deleting the first digit keeps the caret at the start.
    expect(caretAfter(",250", 0, "250")).toBe(0);
  });
});
