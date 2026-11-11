import type { Metadata } from "next";
import { headers } from "next/headers";
import { ChevronDown } from "lucide-react";
import { billingEnabled } from "@/lib/billing/stripe";
import { resolveLegalLocale } from "@/lib/legal-language";
import { legalCopy } from "./legal-copy";
import { adsActive } from "@/components/adsense-loader";
import { LegalLanguageSwitch, LegalSectionRestore } from "./legal-language-switch";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { NextStepCards } from "@/components/next-step-cards";
import styles from "./legal.module.css";
import { notFound } from "next/navigation";
import { legalOperator, legalPublished } from "@/lib/legal";

export const dynamic = "force-dynamic";
type Query = { lang?: string | string[]; region?: string | string[] };
type Props = { searchParams: Promise<Query> };
async function language(query: Query) {
  return resolveLegalLocale(query.lang, (await headers()).get("accept-language"));
}
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  if (!legalPublished) notFound();
  const query = await searchParams;
  const locale = await language(query);
  const explicit = query.lang === "de" || query.lang === "en";
  return {
    title:
      locale === "de"
        ? "Impressum, Datenschutz & Nutzungsbedingungen"
        : "Legal notice, privacy & terms",
    description:
      locale === "de"
        ? "Impressum (Anbieterkennzeichnung nach § 5 DDG), Datenschutzerklärung, Cookies und Nutzungsbedingungen von Outpost."
        : "Outpost’s legal notice (Impressum under section 5 DDG), privacy policy, cookies and terms of use.",
    // Indexable in both languages: each explicit language is its own canonical; the plain
    // address follows the browser language and is the x-default.
    alternates: {
      canonical: explicit ? `/legal?lang=${locale}` : "/legal",
      languages: { en: "/legal?lang=en", de: "/legal?lang=de", "x-default": "/legal" },
    },
  };
}
export default async function Legal({ searchParams }: Props) {
  if (!legalPublished) notFound();
  const query = await searchParams;
  const locale = await language(query);
  const de = locale === "de";
  const billing = billingEnabled();
  const copy = legalCopy(locale, legalOperator(), billing, !!adsActive());
  const region =
    typeof query.region === "string" && ["europe", "americas", "asia"].includes(query.region)
      ? query.region
      : undefined;
  const contents = (
    <>
      {copy.sections.map(({ id, title }) => (
        <a key={id} href={`#${id}`}>
          {title}
        </a>
      ))}
    </>
  );
  return (
    <div className={styles.page} lang={locale}>
      <WorkspaceHeading
        glyph="reference"
        scene="roads"
        title={copy.title}
        accent="Outpost"
        description={copy.description}
      >
        <div className={styles.mastheadRow}>
          <LegalLanguageSwitch locale={locale} region={region} />
          <span className="landing-chip is-muted">{copy.updated}</span>
        </div>
      </WorkspaceHeading>
      <div className={styles.layout}>
        <nav className={`raised ${styles.contents}`} aria-label={copy.contentsAria}>
          <strong>{copy.contentsLabel}</strong>
          {contents}
        </nav>
        <div className={`raised ${styles.document}`}>
          <details className={styles.mobileContents}>
            <summary>
              {copy.contentsLabel}
              <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <nav aria-label={copy.contentsAria}>{contents}</nav>
          </details>
          <article className={styles.article}>
            {copy.sections.map(({ id, title, body }) => {
              const heading =
                id === "data-sources"
                  ? "data-title"
                  : id === "scene-artwork"
                    ? "art-title"
                    : `${id}-title`;
              return (
                <section key={id} id={id} aria-labelledby={heading}>
                  <h2 id={heading}>{title}</h2>
                  {body}
                </section>
              );
            })}
          </article>
          <LegalSectionRestore />
        </div>
      </div>
      <NextStepCards
        id="legal-next"
        title={
          de ? (
            <>
              Ihre <em>Daten</em> verwalten
            </>
          ) : (
            <>
              Manage your <em>data</em>
            </>
          )
        }
        line={
          de
            ? `Exportieren oder löschen Sie Ihr Konto selbst${billing ? ", oder lesen Sie, was Supporter bekommen" : ""}.`
            : `Export or delete your account yourself${billing ? ", or see what Supporters get" : ""}.`
        }
        cards={[
          {
            href: "/settings#account-data",
            emblem: "team-roles",
            title: de ? "Einstellungen" : "Settings",
            line: de
              ? "Ihre Daten exportieren oder das Konto löschen."
              : "Export your data or delete your account.",
            scene: "city",
          },
          ...(billing
            ? [
                {
                  href: "/supporter",
                  emblem: "silver",
                  title: "Supporter",
                  line: de
                    ? "Was der Plan kostet, was er enthält und wie Sie kündigen."
                    : "What the plan costs, what it includes and how to cancel.",
                  scene: "economy" as const,
                },
              ]
            : []),
          {
            href: "/tools",
            emblem: "tool-craft",
            title: "Tools",
            line: de
              ? "Zurück zu Markt, Crafting und Planung."
              : "Back to the market, crafting and planning tools.",
            scene: "market",
          },
        ]}
      />
    </div>
  );
}
