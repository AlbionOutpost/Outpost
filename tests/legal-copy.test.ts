import { describe, expect, it } from "vitest";
import { createElement, Fragment, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
/** The text as the page shows it, components (address, email, provider) rendered. */
const markup = (node: ReactNode) => renderToStaticMarkup(createElement(Fragment, null, node));
const rendered = (node: ReactNode) =>
  markup(node)
    .replace(/<br\/>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/[ \t]+/g, " ");
const expectedIds = [
  "operator",
  "privacy",
  "cookies",
  "providers",
  "retention",
  "rights",
  "terms",
  "payments",
  "supporter-terms",
  "withdrawal",
  "withdrawal-form",
  "data-sources",
  "scene-artwork",
  "media",
];
// The production operator, as scripts/cloudflare-release-config.mjs sets it.
const operator = {
  name: "Hollow Lantern, Inhaber Rotenda Sino",
  address: "c/o Impressumservice Dein-Impressum\nStettiner Str. 41\n35410 Hungen\nDeutschland",
  email: "contact@albionoutpost.com",
  editor: "Rotenda Sino",
};
const copy = (locale: LegalLocale, configured = false, ads = false) =>
  legalCopy(locale, operator, configured, ads);
const section = (locale: LegalLocale, id: string, configured = false) =>
  copy(locale, configured).sections.find((part) => part.id === id)!;

describe("advertising text follows whether ads run", () => {
  it.each(["en", "de"] as const)(
    "no ads: no consent cookie and a no-advertising note (%s)",
    (locale) => {
      const body = text(section(locale, "cookies").body);
      expect(body).not.toContain("FCCDCF");
      expect(body).toMatch(locale === "de" ? /Keine Werbung/ : /No advertising/);
      expect(body).not.toMatch(/Google Ireland/);
    },
  );
  it.each(["en", "de"] as const)(
    "ads on: AdSense, the consent cookie and the choice (%s)",
    (locale) => {
      const cookies = legalCopy(locale, {}, false, true).sections.find((s) => s.id === "cookies")!;
      const flat = nodes(cookies.body);
      expect(flat.filter((node) => node.type === "tr")).toHaveLength(6);
      const body = text(cookies.body);
      expect(body).toContain("FCCDCF");
      expect(body).toContain("Google Ireland");
      expect(body).toContain("Privacy and cookie settings");
    },
  );
});

describe("published bilingual legal page", () => {
  it("retains all 14 topics and complete section structure in both languages", () => {
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
    const links = (locale: LegalLocale, billing = true) =>
      copy(locale, billing)
        .sections.flatMap((part) =>
          nodes(part.body)
            .map((node) => node.props.href)
            .filter(Boolean),
        )
        .sort();
    expect(links("en")).toEqual(links("de"));
    for (const required of [
      "#operator",
      "#advertising",
      "/contact",
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
    // The Supporter page 404s while billing is off, so the policy names it without a link.
    expect(links("en", false)).not.toContain("/supporter");
    expect(links("de", false)).not.toContain("/supporter");
  });
  it.each(["en", "de"] as const)(
    "retains actual storage inventory and keyboard-accessible region (%s)",
    (locale) => {
      const body = section(locale, "cookies").body;
      const flat = nodes(body);
      expect(flat.filter((node) => node.type === "tbody")).toHaveLength(1);
      expect(flat.filter((node) => node.type === "tr")).toHaveLength(5);
      expect(flat.some((node) => node.props.role === "region" && node.props.tabIndex === 0)).toBe(
        true,
      );
      const content = text(body);
      for (const value of [
        "NextAuth",
        "PKCE",
        "atlas-theme",
        "atlas-region",
        "localStorage",
        "14",
        "15",
        "365",
      ])
        expect(content).toContain(value);
      // Pages render without a routing cookie since 9 Nov 2026.
      expect(content).not.toContain("outpost-route");
    },
  );
  it.each(["en", "de"] as const)(
    "the Impressum names the provider, legal form, address, email, contact form and editor (%s)",
    (locale) => {
      const body = section(locale, "operator").body;
      const flat = nodes(body);
      const labels = flat
        .filter((node) => node.type === "dt")
        .map((node) => rendered(node.props.children));
      const values = flat
        .filter((node) => node.type === "dd")
        .map((node) => rendered(node.props.children));
      expect(labels).toEqual(
        locale === "de"
          ? [
              "Anbieter",
              "Rechtsform",
              "Ladungsfähige Anschrift",
              "E-Mail",
              "Kontaktformular",
              "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV",
            ]
          : [
              "Provider",
              "Legal form",
              "Address for service",
              "Email",
              "Contact form",
              "Responsible for content under section 18(2) MStV",
            ],
      );
      expect(values[0]).toBe("Hollow Lantern, Inhaber Rotenda Sino");
      expect(values[1]).toContain("Einzelunternehmen");
      expect(values[5]).toBe(
        locale === "de" ? "Rotenda Sino, Anschrift wie oben" : "Rotenda Sino, address as above",
      );
      // The four-line c/o address keeps its line breaks.
      const address = renderToStaticMarkup(createElement(Fragment, null, body));
      expect(address).toContain(
        "c/o Impressumservice Dein-Impressum<br/>Stettiner Str. 41<br/>35410 Hungen<br/>Deutschland",
      );
      expect(address).toContain('href="mailto:contact@albionoutpost.com"');
      expect(flat.some((node) => node.props.href === "/contact")).toBe(true);
      expect(rendered(body)).toMatch(
        locale === "de"
          ? /Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer\s+Verbraucherschlichtungsstelle teilzunehmen\./
          : /neither willing nor obliged to take part in dispute resolution/,
      );
      expect(rendered(body)).toContain("Sandbox Interactive");
      expect(rendered(body)).not.toMatch(/USt|VAT/);
    },
  );
  it.each(["en", "de"] as const)(
    "the privacy policy names the real controller and the contact form (%s)",
    (locale) => {
      const body = rendered(section(locale, "privacy").body).replace(/\s+/g, " ");
      expect(body).toContain("Hollow Lantern, Inhaber Rotenda Sino");
      expect(body).toContain(
        "c/o Impressumservice Dein-Impressum, Stettiner Str. 41, 35410 Hungen, Deutschland",
      );
      expect(body).toMatch(
        locale === "de"
          ? /Datenschutzbeauftragter ist nicht benannt/
          : /No data protection officer is appointed/,
      );
      expect(body).toMatch(locale === "de" ? /Kontaktformular/ : /contact form/);
      expect(body).toContain("Zoho");
      expect(body).toMatch(/6\(1\)\(b\)|6 Abs\. 1 lit\. b/);
      expect(body).not.toMatch(/oben zu benennende|to be identified/);
    },
  );
  it.each(["en", "de"] as const)("a comma-separated address renders as rows too (%s)", (locale) => {
    const html = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        legalCopy(locale, { ...operator, address: "Street 1, 12345 Town, Country" }, false)
          .sections[0].body,
      ),
    );
    expect(html).toContain("Street 1<br/>12345 Town<br/>Country");
  });
  it.each(["en", "de"] as const)(
    "no draft banner, open markers or placeholders remain, whatever billing and ads are (%s)",
    (locale) => {
      for (const billing of [false, true])
        for (const ads of [false, true]) {
          const result = copy(locale, billing, ads);
          expect(result).not.toHaveProperty("draftTitle");
          const all = result.sections.map((part) => rendered(part.body)).join(" ");
          expect(all).not.toMatch(
            /\bEntwurf\b|\bDraft\b|\bfehlt\b|\bpending\b|Prüfung offen|zu ergänzen|Anwendbarkeit offen|zu prüfen|Offen:|unresolved|still need|to be supplied|nicht hinterlegt|— not set|vorläufig/i,
          );
          expect(result.updated).toMatch(/11\. November 2026|11 November 2026/);
          const markup = renderToStaticMarkup(
            createElement(Fragment, null, ...result.sections.map((part) => part.body)),
          );
          expect(markup).not.toContain('class="open"');
        }
    },
  );
  it.each(["en", "de"] as const)("an unset operator value stays visibly missing (%s)", (locale) => {
    const body = rendered(legalCopy(locale, {}, false).sections[0].body);
    expect(body).toContain(locale === "de" ? "— nicht hinterlegt" : "— not set");
  });
  it("billing off: the payment sections say nothing is for sale; on: Stripe is set up", () => {
    const enOff = text(section("en", "payments", false).body),
      enOn = text(section("en", "payments", true).body);
    const deOff = text(section("de", "payments", false).body),
      deOn = text(section("de", "payments", true).body);
    expect(enOff).toContain("Outpost sells nothing at present");
    expect(enOn).toContain("Payments through Stripe are set up");
    expect(deOff).toContain("Outpost verkauft derzeit nichts");
    expect(deOn).toContain("Zahlungsabwicklung über Stripe ist eingerichtet");
    expect(enOn).toContain("Supporters see no ads");
    expect(deOn).toContain("Supporter sehen keine Werbung");
    expect(text(section("en", "supporter-terms", false).body)).toContain(
      "The Supporter plan is not offered at present.",
    );
    expect(text(section("de", "supporter-terms", false).body)).toContain(
      "Der Supporter-Plan wird derzeit nicht angeboten.",
    );
    expect(text(section("en", "supporter-terms", true).body)).not.toContain("not offered");
    expect(text(section("de", "supporter-terms", true).body)).toContain(
      "Verbraucherschlichtungsstelle",
    );
  });
  it.each(["en", "de"] as const)(
    "ads on: the advertising section tells the real story (%s)",
    (locale) => {
      const body = text(copy(locale, false, true).sections.find((s) => s.id === "cookies")!.body);
      expect(body).toMatch(/IAB TCF/);
      expect(body).toMatch(/Do Not Sell or Share My Personal Information/);
      expect(body).toMatch(locale === "de" ? /Supporter mit Abo/ : /Supporters with a plan/);
      expect(body).toMatch(
        locale === "de"
          ? /Werbeskript wird für sie nicht geladen/
          : /ad script is not loaded for them/,
      );
    },
  );
});
