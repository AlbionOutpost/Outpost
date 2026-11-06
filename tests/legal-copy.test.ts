import { describe, expect, it } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { legalCopy, type LegalLocale } from "../src/app/legal/legal-copy";

type Props = { children?: ReactNode; href?: string; role?: string; tabIndex?: number };
const nodes = (node: ReactNode): ReturnType<typeof walk> => walk(node);
function walk(node: ReactNode): { type: unknown; props: Props }[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!isValidElement<Props>(node)) return [];
  return [{ type: node.type, props: node.props }, ...walk(node.props.children)];
}
function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  return isValidElement<Props>(node) ? text(node.props.children) : "";
}
const expectedIds = [
  "operator",
  "privacy",
  "cookies",
  "providers",
  "retention",
  "rights",
  "terms",
  "payments",
  "withdrawal",
  "data-sources",
  "scene-artwork",
  "media",
];
const copy = (locale: LegalLocale, configured = false) => legalCopy(locale, {}, configured);
const section = (locale: LegalLocale, id: string, configured = false) =>
  copy(locale, configured).sections.find((part) => part.id === id)!;

describe("faithful bilingual legal draft", () => {
  it("retains all12 topics and complete section structure in both languages", () => {
    expect(copy("en").sections.map((part) => part.id)).toEqual(expectedIds);
    expect(copy("de").sections.map((part) => part.id)).toEqual(expectedIds);
    for (const id of expectedIds) {
      const de = section("de", id),
        en = section("en", id);
      const structure = (body: ReactNode) =>
        nodes(body)
          .filter((node) => ["p", "h3", "li", "tr", "td", "th"].includes(String(node.type)))
          .map((node) => node.type);
      expect(structure(en.body), id).toEqual(structure(de.body));
      expect(text(en.body).replace(/\s+/g, " ").length, id).toBeGreaterThan(200);
    }
  });
  it("preserves every linked legal/provider/source destination and internal action", () => {
    const links = (locale: LegalLocale) =>
      copy(locale)
        .sections.flatMap((part) =>
          nodes(part.body)
            .map((node) => node.props.href)
            .filter(Boolean),
        )
        .sort();
    expect(links("en")).toEqual(links("de"));
    for (const required of [
      "#operator",
      "/settings#account-data",
      "/settings#account-delete",
      "/supporter",
      "https://www.gesetze-im-internet.de/ddg/__5.html",
      "https://www.gesetze-im-internet.de/ttdsg/__25.html",
      "https://www.gesetze-im-internet.de/bgb/__312k.html",
      "https://www.gesetze-im-internet.de/bgb/__356a.html",
      "https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50",
      "/licenses/barlow-condensed-OFL.txt",
      "/licenses/inter-OFL.txt",
      "/licenses/geist-mono-OFL.txt",
    ])
      expect(links("en")).toContain(required);
  });
  it.each(["en", "de"] as const)(
    "retains actual storage inventory and keyboard-accessible region (%s)",
    (locale) => {
      const body = section(locale, "cookies").body;
      const flat = nodes(body);
      expect(flat.filter((node) => node.type === "tbody")).toHaveLength(1);
      expect(flat.filter((node) => node.type === "tr")).toHaveLength(7);
      expect(flat.some((node) => node.props.role === "region" && node.props.tabIndex === 0)).toBe(
        true,
      );
      const content = text(body);
      for (const value of [
        "NextAuth",
        "PKCE",
        "outpost-route",
        "FCCDCF",
        "atlas-theme",
        "atlas-region",
        "localStorage",
        "14",
        "15",
        "30",
        "365",
      ])
        expect(content).toContain(value);
    },
  );
  it.each(["en", "de"] as const)(
    "uses concise missing labels without omitting required particulars (%s)",
    (locale) => {
      const body = section(locale, "operator").body;
      const labels = nodes(body)
        .filter((node) => node.type === "dd")
        .map((node) => text(node.props.children));
      expect(labels).toHaveLength(5);
      for (const label of labels) {
        expect(label.length).toBeLessThan(35);
        expect(label).not.toMatch(/[\[\]]/);
      }
      const content = text(body);
      if (locale === "en")
        for (const value of [
          "authorised representatives",
          "house number",
          "VAT",
          "licensing authority",
          "journalistic",
        ])
          expect(content).toContain(value);
      else
        for (const value of [
          "Vertretungsberechtigte",
          "Hausnummer",
          "Umsatzsteuer",
          "Zulassungsbehörde",
          "journalistisch",
        ])
          expect(content).toContain(value);
    },
  );
  it.each(["en", "de"] as const)(
    "renders supplied operator values and contact without replacing unresolved duties (%s)",
    (locale) => {
      const result = legalCopy(
        locale,
        { name: "Fixture Operator", address: "Fixture address", email: "operator@example.invalid" },
        false,
      );
      const body = result.sections[0].body;
      expect(text(body)).toContain("Fixture Operator");
      expect(text(body)).toContain("Fixture address");
      expect(
        nodes(body).some((node) => node.props.href === "mailto:operator@example.invalid"),
      ).toBe(true);
      expect(result.draftTitle).toMatch(/Draft|Entwurf/);
      expect(text(body)).toMatch(/Applicability under review|Anwendbarkeit offen/);
    },
  );
  it("keeps configured billing distinct from legal approval and advertising activation", () => {
    const enOff = text(section("en", "payments", false).body),
      enOn = text(section("en", "payments", true).body);
    const deOff = text(section("de", "payments", false).body),
      deOn = text(section("de", "payments", true).body);
    expect(enOff).toContain("Stripe billing is not fully configured");
    expect(enOn).toContain("does not establish legal approval");
    expect(deOff).toContain("Stripe-Abrechnung ist nicht vollständig konfiguriert");
    expect(deOn).toContain("belegt keine rechtliche Freigabe");
    expect(enOn).toContain("Supporters see no ads");
    expect(deOn).toContain("Supporter sehen keine Werbung");
  });
  it("states that both documents remain drafts without creating compliance proof", () => {
    expect(copy("en").draftBody).toContain("does not confirm legal compliance");
    expect(copy("de").draftBody).toContain("bestätigt keine rechtliche Konformität");
    expect(text(section("en", "withdrawal").body)).toContain(
      "not functioning cancellation or withdrawal buttons",
    );
    expect(text(section("en", "scene-artwork").body)).toContain(
      "does not prove that all labelling or rights obligations have been met",
    );
  });
});
