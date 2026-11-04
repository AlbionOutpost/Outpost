import type { Metadata } from "next";
import { headers } from "next/headers";
import { ChevronDown, Info } from "lucide-react";
import { billingEnabled } from "@/lib/billing/stripe";
import { resolveLegalLocale } from "@/lib/legal-language";
import { legalCopy } from "./legal-copy";
import { LegalLanguageSwitch, LegalSectionRestore } from "./legal-language-switch";
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
  };
}
export default async function Legal({ searchParams }: Props) {
  const query = await searchParams;
  const locale = await language(query);
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
      <div className={styles.layout}>
        <nav className={styles.contents} aria-label={copy.contentsAria}>
          <strong>{copy.contentsLabel}</strong>
          {contents}
        </nav>
        <div className={styles.document}>
          <header className={styles.header}>
            <div className={styles.headingRow}>
              <h1>{copy.title}</h1>
              <LegalLanguageSwitch locale={locale} region={region} />
            </div>
            <p>{copy.description}</p>
            <p className={styles.updated}>{copy.updated}</p>
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
          </header>
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
    </div>
  );
}
