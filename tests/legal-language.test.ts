import { describe, expect, it } from "vitest";
import { resolveLegalLocale, type LegalLocale } from "../src/lib/legal-language";

describe("request-local legal language negotiation", () => {
  it.each<[string | string[] | undefined, string, LegalLocale]>([
    ["en", "de-DE,de;q=0.9", "en"],
    ["de", "en-US,en;q=0.9", "de"],
    [["de"], "en", "de"],
    [["en"], "de", "en"],
  ])("honors explicit exact supported choice %j", (explicit, header, expected) => {
    expect(resolveLegalLocale(explicit, header)).toBe(expected);
  });
  it.each<[string | string[] | undefined, string, LegalLocale]>([
    [undefined, "de-DE,de;q=0.9,en;q=0.8", "de"],
    [undefined, "en-GB,en;q=0.9,de;q=0.8", "en"],
    [undefined, "fr-FR, de-AT;q=0.8, en;q=0.7", "de"],
    [undefined, "de;q=0.4,en-US;q=0.9", "en"],
    [undefined, "en;q=0.6,de;q=0.7", "de"],
    [undefined, "DE-ch;Q=0.750,en;q=0.5", "de"],
    [undefined, "de;q=0.8,en;q=0.8", "de"],
    [undefined, "en;q=0.8,de;q=0.8", "en"],
    ["fr", "de", "de"],
    ["DE", "en", "en"],
    [" de ", "en", "en"],
    [["de", "en"], "en", "en"],
    [[], "de", "de"],
  ])("negotiates %j / %s", (explicit, header, expected) => {
    expect(resolveLegalLocale(explicit, header)).toBe(expected);
  });
  it.each([
    "de;q=0,en;q=0",
    "fr-FR,es;q=0.9",
    "*",
    "de;q=NaN",
    "de;q=Infinity",
    "de;q=-1",
    "de;q=1.001",
    "de;q=0.1234",
    "de;q=.9",
    "de;q=2",
    "de;q=0.9;q=1",
    "de;foo=bar",
    "de--DE",
    "de_DE",
    "de<script>",
    "",
  ])("ignores unsupported, excluded and malformed ranges: %s", (header) => {
    expect(resolveLegalLocale(undefined, header)).toBe("en");
  });
  it("ignores malformed high priorities rather than discarding valid lower priorities", () => {
    expect(resolveLegalLocale(undefined, "en;q=1.5,de;q=0.5")).toBe("de");
    expect(resolveLegalLocale(undefined, "de;q=0,en;q=0.1")).toBe("en");
    expect(resolveLegalLocale(undefined, "de;q=0.000,en;q=0.001")).toBe("en");
    expect(resolveLegalLocale(undefined, "de;q=1.000,en;q=1.000")).toBe("de");
  });
  it("bounds untrusted header size and range count without weakening explicit overrides", () => {
    const tooLong = `de-${"a".repeat(4096)}`;
    const tooMany = Array.from({ length: 33 }, () => "de").join(",");
    expect(resolveLegalLocale(undefined, tooLong)).toBe("en");
    expect(resolveLegalLocale(undefined, tooMany)).toBe("en");
    expect(resolveLegalLocale("de", tooLong)).toBe("de");
    expect(resolveLegalLocale("de", tooMany)).toBe("de");
    expect(resolveLegalLocale(undefined, Array.from({ length: 32 }, () => "de").join(","))).toBe(
      "de",
    );
    expect(resolveLegalLocale(undefined, null)).toBe("en");
  });
});
