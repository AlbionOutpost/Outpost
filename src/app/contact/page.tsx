import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { legalOperator, legalPublished } from "@/lib/legal";
import { resolveLegalLocale } from "@/lib/legal-language";
import { contactStatuses, type ContactStatus } from "@/lib/contact-fields";
import { LegalLanguageSwitch } from "../legal/legal-language-switch";
import { contactCopy } from "./contact-copy";
import { ContactForm } from "./contact-form";
import styles from "./contact.module.css";

export const dynamic = "force-dynamic";
type Query = { lang?: string | string[]; status?: string | string[]; region?: string | string[] };
type Props = { searchParams: Promise<Query> };
async function language(query: Query) {
  return resolveLegalLocale(query.lang, (await headers()).get("accept-language"));
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  // The contact form is the Impressum's second contact channel; it goes live with /legal.
  if (!legalPublished) notFound();
  const query = await searchParams;
  const locale = await language(query);
  const explicit = query.lang === "de" || query.lang === "en";
  const copy = contactCopy(locale);
  return {
    title: locale === "de" ? "Kontakt" : "Contact",
    description: copy.description,
    // A result page (?status=…) is the same form; only the plain address is indexed.
    ...(query.status ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: explicit ? `/contact?lang=${locale}` : "/contact",
      languages: { en: "/contact?lang=en", de: "/contact?lang=de", "x-default": "/contact" },
    },
  };
}

export default async function Contact({ searchParams }: Props) {
  if (!legalPublished) notFound();
  const query = await searchParams;
  const locale = await language(query);
  const copy = contactCopy(locale);
  const operator = legalOperator();
  const status = contactStatuses.find((value) => value === query.status) as
    ContactStatus | undefined;
  const region =
    typeof query.region === "string" && ["europe", "americas", "asia"].includes(query.region)
      ? query.region
      : undefined;
  return (
    <div className={styles.page} lang={locale}>
      <WorkspaceHeading
        glyph="reference"
        scene="roads"
        title={copy.title}
        accent={copy.accent}
        description={copy.description}
      >
        <div className={styles.mastheadRow}>
          <LegalLanguageSwitch locale={locale} region={region} path="/contact" />
        </div>
      </WorkspaceHeading>
      <div className={styles.layout}>
        <ContactForm locale={locale} initialStatus={status} />
        <aside
          className={`raised ${styles.rail}`}
          aria-label={locale === "de" ? "Weitere Kontaktwege" : "Other ways to reach us"}
        >
          {operator.email && (
            <section>
              <h2>{copy.railEmailTitle}</h2>
              <p>
                {copy.railEmail} <a href={`mailto:${operator.email}`}>{operator.email}</a>.
              </p>
            </section>
          )}
          <section>
            <h2>{copy.railNoticeTitle}</h2>
            <p>
              {copy.railNotice}{" "}
              <Link href={`/legal?lang=${locale}#operator`}>{copy.railNoticeLink}</Link>.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
