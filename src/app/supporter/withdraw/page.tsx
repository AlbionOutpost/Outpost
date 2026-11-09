import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { DiscordMark } from "@/components/discord-mark";
import { SupporterWithdraw } from "@/components/supporter-withdraw";
import styles from "@/components/supporter-order.module.css";
import { authOptions } from "@/lib/auth";
import { privateMetadata } from "@/lib/seo";
import { billingProfile } from "@/lib/billing/plan";
import { terminalSubscription } from "@/lib/billing/reconciliation";
import { billingEnabled, listSubscriptions, stripeConfig } from "@/lib/billing/stripe";
import { contractStart, withdrawalDeadline, withinWithdrawal } from "@/lib/billing/withdrawal";
import { resolveLegalLocale, type LegalLocale } from "@/lib/legal-language";
import { signInPath } from "@/lib/sign-in-return";
import { displayName } from "@/lib/display-name";

export const dynamic = "force-dynamic";
export const metadata: Metadata = privateMetadata("Withdraw from contract");

const contact = "contact@albionoutpost.com";
const copy = {
  en: {
    title: "Withdraw from contract",
    accent: "Withdraw",
    description:
      "Changed your mind? Within 14 days of ordering you can withdraw from the Supporter plan and get every payment back.",
    formTitle: "Confirm your withdrawal",
    signInTitle: "Sign in to withdraw",
    signIn:
      "The plan belongs to your Outpost account. Sign in with the Discord account you paid with and withdraw here in one step.",
    byEmail: `You can also withdraw by email: write to ${contact} that you withdraw from the contract, with your Discord name and the email address on your Stripe receipt. The model withdrawal form is on the legal page; you don't have to use it.`,
    formLink: "Model withdrawal form",
    signInButton: "Sign in with Discord",
    noneTitle: "No contract on this account",
    none: "This account has no Supporter plan. If you paid with another Discord account, sign in with that one.",
    outsideTitle: "The withdrawal period has ended",
    outside:
      "Withdrawal is possible for 14 days after ordering, and no contract on this account is inside that period. You can still cancel to the end of the paid month.",
    cancelLink: "Cancel subscription",
    account: "Account",
    contract: "Contract",
    contractName: "Outpost Supporter, monthly",
    contractLine: "Outpost Supporter, monthly, ordered on",
    unavailable: "Unavailable",
    ended: "ended",
    deadline: "Withdraw until",
    refund: "Refund",
    refundLine: "Every payment, in full, to the card or account you paid with.",
    language: "Language",
  },
  de: {
    title: "Vertrag widerrufen",
    accent: "widerrufen",
    description:
      "Innerhalb von 14 Tagen nach der Bestellung können Sie den Supporter-Plan widerrufen und erhalten alle Zahlungen zurück.",
    formTitle: "Widerruf bestätigen",
    signInTitle: "Zum Widerrufen anmelden",
    signIn:
      "Der Plan gehört zu Ihrem Outpost-Konto. Melden Sie sich mit dem Discord-Konto an, mit dem Sie bezahlt haben, und widerrufen Sie hier in einem Schritt.",
    byEmail: `Sie können auch per E-Mail widerrufen: Schreiben Sie an ${contact}, dass Sie den Vertrag widerrufen, mit Ihrem Discord-Namen und der E-Mail-Adresse auf Ihrer Stripe-Rechnung. Das Muster-Widerrufsformular steht auf der Rechtsseite; Sie müssen es nicht verwenden.`,
    formLink: "Muster-Widerrufsformular",
    signInButton: "Mit Discord anmelden",
    noneTitle: "Kein Vertrag auf diesem Konto",
    none: "Auf diesem Konto gibt es keinen Supporter-Plan. Wenn Sie mit einem anderen Discord-Konto bezahlt haben, melden Sie sich mit diesem an.",
    outsideTitle: "Die Widerrufsfrist ist abgelaufen",
    outside:
      "Ein Widerruf ist 14 Tage nach der Bestellung möglich, und auf diesem Konto ist kein Vertrag mehr in dieser Frist. Sie können weiterhin zum Ende des bezahlten Monats kündigen.",
    cancelLink: "Verträge hier kündigen",
    account: "Konto",
    contract: "Vertrag",
    contractName: "Outpost Supporter, monatlich",
    contractLine: "Outpost Supporter, monatlich, bestellt am",
    unavailable: "Nicht verfügbar",
    ended: "beendet",
    deadline: "Widerruf möglich bis",
    refund: "Erstattung",
    refundLine:
      "Alle Zahlungen, vollständig, auf die Karte oder das Konto, mit dem Sie bezahlt haben.",
    language: "Sprache",
  },
} as const;

const dateFormat = (locale: LegalLocale, time: boolean) =>
  new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit", timeZoneName: "short" } : {}),
    timeZone: "Europe/Berlin",
  });

/**
 * The § 356a BGB withdrawal page, linked beside the cancellation link in the footer on every
 * page while billing is configured. Signed out it explains sign-in and the email route; signed
 * in it reads the account's own subscriptions from Stripe and lists those still inside the
 * 14-day period with the confirmation button, or says that there is none.
 */
export default async function WithdrawContract({
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
  // The account's Supporter subscriptions; null when Stripe could not be read (the button still
  // shows, and the server checks again when it is pressed).
  let all: Awaited<ReturnType<typeof listSubscriptions>> | null = [];
  if (profile?.stripeCustomerId) {
    try {
      all = (await listSubscriptions(config, profile.stripeCustomerId)).filter((s) =>
        s.items?.data.some((item) => item.price?.id === config.priceId),
      );
    } catch {
      all = null;
    }
  }
  const open = all && withinWithdrawal(all, config.priceId);
  const day = dateFormat(locale, false);
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
          href={`/supporter/withdraw?lang=${code}`}
          hrefLang={code}
          lang={code}
          aria-current={code === locale ? "true" : undefined}
        >
          {label}
        </a>
      ))}
    </nav>
  );
  const head = (title: string) => (
    <div className={styles.head}>
      <h2>{title}</h2>
      {languages}
    </div>
  );
  const byEmail = (
    <p className={styles.vat}>
      {t.byEmail.split(contact)[0]}
      <a href={`mailto:${contact}`}>{contact}</a>
      {t.byEmail.split(contact)[1]}{" "}
      <Link href={`/legal?lang=${locale}#withdrawal-form`}>{t.formLink}</Link>
    </p>
  );
  let body: React.ReactNode;
  if (!profile)
    body = (
      <>
        {head(t.signInTitle)}
        <p className={styles.vat}>{t.signIn}</p>
        <div className={styles.submit}>
          <Link className="button primary" href={signInPath(`/supporter/withdraw?lang=${locale}`)}>
            <DiscordMark /> {t.signInButton}
          </Link>
        </div>
        {byEmail}
      </>
    );
  else if (all && !all.length)
    body = (
      <>
        {head(t.noneTitle)}
        <p className={styles.vat}>{t.none}</p>
        {byEmail}
      </>
    );
  else if (open && !open.length)
    body = (
      <>
        {head(t.outsideTitle)}
        <p className={styles.vat}>{t.outside}</p>
        <div className={styles.submit}>
          <Link className="button secondary" href={`/supporter/cancel?lang=${locale}`}>
            {t.cancelLink}
          </Link>
        </div>
      </>
    );
  else {
    const deadline = open?.length
      ? Math.min(...open.map((s) => withdrawalDeadline(contractStart(s))))
      : null;
    body = (
      <>
        {head(t.formTitle)}
        <dl className={styles.summary}>
          <div className="well">
            <dt>{t.account}</dt>
            <dd>{displayName(profile.name)}</dd>
          </div>
          <div className="well">
            <dt>{t.contract}</dt>
            {open?.length ? (
              open.map((s) => (
                <dd key={s.id}>
                  {t.contractLine} {day.format(contractStart(s) * 1000)}
                  {terminalSubscription(s.status) ? ` (${t.ended})` : ""}
                </dd>
              ))
            ) : (
              <dd>{t.contractName}</dd>
            )}
          </div>
          <div className="well">
            <dt>{t.deadline}</dt>
            <dd>
              {deadline ? (
                dateFormat(locale, true).format(deadline)
              ) : (
                <span className={styles.missing}>
                  — <small>{t.unavailable}</small>
                </span>
              )}
            </dd>
          </div>
          <div className="well">
            <dt>{t.refund}</dt>
            <dd>{t.refundLine}</dd>
          </div>
        </dl>
        <SupporterWithdraw locale={locale} />
        {byEmail}
      </>
    );
  }
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
