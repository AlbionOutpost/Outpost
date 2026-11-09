import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { DiscordMark } from "@/components/discord-mark";
import { SupporterCancel } from "@/components/supporter-cancel";
import styles from "@/components/supporter-order.module.css";
import { authOptions } from "@/lib/auth";
import { privateMetadata } from "@/lib/seo";
import { billingProfile } from "@/lib/billing/plan";
import { terminalSubscription } from "@/lib/billing/reconciliation";
import { billingEnabled, listSubscriptions, stripeConfig } from "@/lib/billing/stripe";
import { resolveLegalLocale, type LegalLocale } from "@/lib/legal-language";
import { signInPath } from "@/lib/sign-in-return";
import { displayName } from "@/lib/display-name";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privateMetadata("Cancel subscription");

const contact = "contact@albionoutpost.com";
const copy = {
  en: {
    title: "Cancel your subscription",
    accent: "subscription",
    description: "End your Outpost Supporter plan. It runs to the end of the month you paid for.",
    formTitle: "Confirm your cancellation",
    signInTitle: "Sign in to cancel",
    signIn:
      "The plan belongs to your Outpost account. Sign in with the Discord account you paid with and cancel here in one step.",
    byEmail: `Or cancel by email: write to ${contact} with your Discord name and the email address on your Stripe receipt.`,
    signInButton: "Sign in with Discord",
    noneTitle: "No subscription on this account",
    none: "This account has no Supporter subscription running. If you pay with another Discord account, sign in with that one.",
    doneTitle: "Already cancelled",
    done: "Your subscription is cancelled. The plan ends on",
    doneUnknown: "Your subscription is cancelled. The plan ends at the end of the paid month.",
    account: "Account",
    contract: "Contract",
    contractLine: "Outpost Supporter, monthly",
    effective: "Ends",
    effectiveLine: "At the end of the paid month",
    confirmation: "Confirmation",
    confirmationLine: "Stripe emails it to the address on your billing account.",
    language: "Language",
  },
  de: {
    title: "Verträge hier kündigen",
    accent: "kündigen",
    description:
      "Kündigen Sie Ihren Outpost-Supporter-Plan. Er läuft bis zum Ende des bezahlten Monats.",
    formTitle: "Kündigung bestätigen",
    signInTitle: "Zum Kündigen anmelden",
    signIn:
      "Der Plan gehört zu Ihrem Outpost-Konto. Melden Sie sich mit dem Discord-Konto an, mit dem Sie bezahlt haben, und kündigen Sie hier in einem Schritt.",
    byEmail: `Oder kündigen Sie per E-Mail: Schreiben Sie an ${contact} mit Ihrem Discord-Namen und der E-Mail-Adresse auf Ihrer Stripe-Rechnung.`,
    signInButton: "Mit Discord anmelden",
    noneTitle: "Kein Abonnement auf diesem Konto",
    none: "Auf diesem Konto läuft kein Supporter-Abonnement. Wenn Sie mit einem anderen Discord-Konto bezahlen, melden Sie sich mit diesem an.",
    doneTitle: "Bereits gekündigt",
    done: "Ihr Abonnement ist gekündigt. Der Plan endet am",
    doneUnknown: "Ihr Abonnement ist gekündigt. Der Plan endet zum Ende des bezahlten Monats.",
    account: "Konto",
    contract: "Vertrag",
    contractLine: "Outpost Supporter, monatlich",
    effective: "Wirksam zum",
    effectiveLine: "Ende des bezahlten Monats",
    confirmation: "Bestätigung",
    confirmationLine: "Stripe schickt sie an die E-Mail-Adresse Ihres Rechnungskontos.",
    language: "Sprache",
  },
} as const;

const longDate = (seconds: number, locale: LegalLocale) =>
  new Date(seconds * 1000).toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });

/**
 * The § 312k BGB cancellation page, linked from the footer on every page while billing is
 * configured. Signed out it explains sign-in and the email route; signed in it reads the
 * account's own subscriptions from Stripe and offers the confirmation form, or says that
 * there is nothing to cancel or that it is already cancelled.
 */
export default async function CancelSubscription({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const config = stripeConfig();
  if (!config || !billingEnabled()) notFound();
  const query = await searchParams;
  const locale = resolveLegalLocale(query.lang, (await headers()).get("accept-language"));
  const t = copy[locale];
  const session = await getServerSession(authOptions);
  const profile = session?.user?.id ? await billingProfile(session.user.id) : null;
  // The account's own subscriptions for the Supporter price; null when Stripe could not be read
  // (the form still shows, and the server checks again when it is sent).
  let live: { end: number | null; cancelling: boolean }[] | null = [];
  if (profile?.stripeCustomerId) {
    try {
      live = (await listSubscriptions(config, profile.stripeCustomerId))
        .filter(
          (s) =>
            !terminalSubscription(s.status) &&
            s.items?.data.some((item) => item.price?.id === config.priceId),
        )
        .map((s) => ({ end: s.current_period_end, cancelling: !!s.cancel_at_period_end }));
    } catch {
      live = null;
    }
  }
  const ends = live?.flatMap((s) => (s.end ? [s.end] : [])) ?? [];
  const end = ends.length ? Math.max(...ends) : null;
  const languages = (
    <nav className={styles.languages} aria-label={t.language}>
      {(
        [
          ["en", "English"],
          ["de", "Deutsch"],
        ] as const
      ).map(([code, label]) => (
        <a
          key={code}
          href={`/supporter/cancel?lang=${code}`}
          hrefLang={code}
          lang={code}
          aria-current={code === locale ? "true" : undefined}
        >
          {label}
        </a>
      ))}
    </nav>
  );
  let body: React.ReactNode;
  if (!profile)
    body = (
      <>
        <div className={styles.head}>
          <h2>{t.signInTitle}</h2>
          {languages}
        </div>
        <p className={styles.vat}>{t.signIn}</p>
        <div className={styles.submit}>
          <Link className="button primary" href={signInPath(`/supporter/cancel?lang=${locale}`)}>
            <DiscordMark /> {t.signInButton}
          </Link>
        </div>
        <p className={styles.vat}>
          {t.byEmail.split(contact)[0]}
          <a href={`mailto:${contact}`}>{contact}</a>
          {t.byEmail.split(contact)[1]}
        </p>
      </>
    );
  else if (live && !live.length)
    body = (
      <>
        <div className={styles.head}>
          <h2>{t.noneTitle}</h2>
          {languages}
        </div>
        <p className={styles.vat}>{t.none}</p>
        <p className={styles.vat}>
          {t.byEmail.split(contact)[0]}
          <a href={`mailto:${contact}`}>{contact}</a>
          {t.byEmail.split(contact)[1]}
        </p>
      </>
    );
  else if (live?.every((s) => s.cancelling))
    body = (
      <>
        <div className={styles.head}>
          <h2>{t.doneTitle}</h2>
          {languages}
        </div>
        <p className={styles.vat}>{end ? `${t.done} ${longDate(end, locale)}.` : t.doneUnknown}</p>
      </>
    );
  else
    body = (
      <>
        <div className={styles.head}>
          <h2>{t.formTitle}</h2>
          {languages}
        </div>
        <dl className={styles.summary}>
          <div className="well">
            <dt>{t.account}</dt>
            <dd>{displayName(profile.name)}</dd>
          </div>
          <div className="well">
            <dt>{t.contract}</dt>
            <dd>{t.contractLine}</dd>
          </div>
          <div className="well">
            <dt>{t.effective}</dt>
            <dd>{end ? `${t.effectiveLine}: ${longDate(end, locale)}` : t.effectiveLine}</dd>
          </div>
          <div className="well">
            <dt>{t.confirmation}</dt>
            <dd>{t.confirmationLine}</dd>
          </div>
        </dl>
        <SupporterCancel locale={locale} />
      </>
    );
  return (
    <div lang={locale}>
      <WorkspaceHeading
        glyph="reference"
        scene="economy"
        title={t.title}
        accent={t.accent}
        description={t.description}
      />
      <section className={`raised ${styles.order}`} aria-label={t.title}>
        {body}
      </section>
    </div>
  );
}
