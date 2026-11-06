import type { Metadata } from "next";
import { headers } from "next/headers";
import { ChevronDown, Info } from "lucide-react";
import { billingEnabled } from "@/lib/billing/stripe";
import { resolveLegalLocale } from "@/lib/legal-language";
import { legalCopy } from "./legal-copy";
import { LegalLanguageSwitch, LegalSectionRestore } from "./legal-language-switch";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { NextStepCards } from "@/components/next-step-cards";
import styles from "./legal.module.css";

export const dynamic = "force-dynamic";
type Query = { lang?: string | string[]; region?: string | string[] };
type Props = { searchParams: Promise<Query> };
async function language(query: Query) {
  return resolveLegalLocale(query.lang, (await headers()).get("accept-language"));
}
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = await language(await searchParams);
  return {
    title:
      locale === "de"
        ? "Impressum, Datenschutz & Nutzungsbedingungen"
        : "Privacy, terms & legal information",
    description:
      locale === "de"
        ? "Betreiberangaben, Datenschutz, Nutzungsregeln und Zahlungshinweise für Outpost. Entwurf mit gekennzeichneten offenen Angaben."
        : "Outpost operator information, privacy, terms and payment details. A draft with clearly marked information still to be completed.",
    robots: { index: false, follow: true },
    // The page serves English and German from ?lang; declared so the pair is understood once indexing is enabled.
    alternates: {
      languages: { en: "/legal?lang=en", de: "/legal?lang=de", "x-default": "/legal" },
    },
  };
}
export default async function Legal({ searchParams }: Props) {
  const query = await searchParams;
  const locale = await language(query);
  const de = locale === "de";
  const copy = legalCopy(
    locale,
    {
      name: process.env.OPERATOR_NAME?.trim(),
      address: process.env.OPERATOR_ADDRESS?.trim(),
      email: process.env.OPERATOR_EMAIL?.trim(),
    },
    billingEnabled(),
  );
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
          <aside className={styles.status} role="note">
            <details>
              <summary>
                <Info size={17} aria-hidden="true" />
                <strong>{copy.draftTitle}</strong>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              <p>{copy.draftBody}</p>
            </details>
          </aside>
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
            ? "Exportieren oder löschen Sie Ihr Konto selbst, oder lesen Sie, was Supporter bekommen."
            : "Export or delete your account yourself, or see what Supporters get."
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
          {
            href: "/supporter",
            emblem: "silver",
            title: "Supporter",
            line: de
              ? "Was der Plan kostet, was er enthält und wie Sie kündigen."
              : "What the plan costs, what it includes and how to cancel.",
            scene: "economy",
          },
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
