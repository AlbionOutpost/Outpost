"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Link from "@/components/link";
import styles from "./supporter-order.module.css";

type Locale = "en" | "de";
const contact = "contact@albionoutpost.com";
const copy = {
  en: {
    submit: "Confirm withdrawal",
    busy: "Withdrawing…",
    effect: "Your plan ends now and every payment is refunded in full.",
    failed: `The withdrawal did not go through completely. Try again, or write to ${contact}: a withdrawal by email counts too.`,
    outside:
      "No contract on this account is inside the 14-day withdrawal period. You can still cancel to the end of the paid month.",
    cancelLink: "Cancel subscription",
    already: "This contract is already withdrawn and refunded.",
    signedOut: "Your session ended. Sign in again to withdraw.",
    busyServer: "Too many attempts. Wait a minute and try again.",
    done: "Withdrawal received",
    received: "Received on",
    refund: "Refund",
    refundLine: "to the card or account you paid with. Banks usually take 5 to 10 days.",
    noRefund: "There was no payment to refund.",
    ends: "Your Supporter plan has ended and nothing is charged again.",
    email: "Stripe emails you a receipt for the refund. You can also print or save this page.",
  },
  de: {
    submit: "Widerruf jetzt bestätigen",
    busy: "Wird widerrufen…",
    effect: "Ihr Plan endet sofort, und alle Zahlungen werden vollständig erstattet.",
    failed: `Der Widerruf ist nicht vollständig durchgegangen. Bitte erneut versuchen oder an ${contact} schreiben: Ein Widerruf per E-Mail gilt ebenso.`,
    outside:
      "Auf diesem Konto ist kein Vertrag mehr in der 14-tägigen Widerrufsfrist. Sie können weiterhin zum Ende des bezahlten Monats kündigen.",
    cancelLink: "Verträge hier kündigen",
    already: "Dieser Vertrag ist bereits widerrufen und erstattet.",
    signedOut: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.",
    busyServer: "Zu viele Versuche. Bitte in einer Minute erneut versuchen.",
    done: "Widerruf eingegangen",
    received: "Eingegangen am",
    refund: "Erstattung",
    refundLine:
      "auf die Karte oder das Konto, mit dem Sie bezahlt haben. Banken brauchen meist 5 bis 10 Tage.",
    noRefund: "Es gab keine Zahlung zu erstatten.",
    ends: "Ihr Supporter-Plan ist beendet, und es wird nichts mehr abgebucht.",
    email:
      "Stripe schickt Ihnen eine Quittung über die Erstattung per E-Mail. Sie können diese Seite auch drucken oder speichern.",
  },
} as const;

type Result = {
  receivedAt: string;
  contracts: { startedAt: string; refunds: { amount: number; currency: string }[] }[];
};
const tag = (locale: Locale) => (locale === "de" ? "de-DE" : "en-GB");
const when = (iso: string, locale: Locale) =>
  new Date(iso).toLocaleString(tag(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "Europe/Berlin",
  });
/** Totals per currency; Stripe amounts are in the smallest unit (cents for EUR). */
function totals(result: Result, locale: Locale) {
  const sums = new Map<string, number>();
  for (const contract of result.contracts)
    for (const refund of contract.refunds)
      sums.set(refund.currency, (sums.get(refund.currency) ?? 0) + refund.amount);
  return [...sums].map(([currency, amount]) =>
    new Intl.NumberFormat(tag(locale), { style: "currency", currency }).format(amount / 100),
  );
}

/**
 * The § 356a BGB confirmation button. The server finds the contracts from the signed-in
 * account; the form names none. The result shows when the withdrawal was received and what is
 * refunded. Errors are explained in the page's language, with the email route.
 */
export function SupporterWithdraw({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; outside: boolean } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  async function withdraw(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/billing/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok && body.receivedAt) return setResult(body);
      setError({
        text:
          r.status === 404
            ? t.outside
            : r.status === 409
              ? t.already
              : r.status === 401
                ? t.signedOut
                : r.status === 429
                  ? t.busyServer
                  : t.failed,
        outside: r.status === 404,
      });
    } catch {
      setError({ text: t.failed, outside: false });
    } finally {
      setBusy(false);
    }
  }
  if (result) {
    const refunded = totals(result, locale);
    return (
      <div className={`well ${styles.done}`} role="status" data-withdraw-result="">
        <CheckCircle2 size={24} aria-hidden="true" />
        <div>
          <h2>{t.done}</h2>
          <p>
            {t.received} <strong>{when(result.receivedAt, locale)}</strong>.
          </p>
          <p>
            {refunded.length ? (
              <>
                {t.refund} <strong className={styles.amount}>{refunded.join(" + ")}</strong>{" "}
                {t.refundLine}
              </>
            ) : (
              t.noRefund
            )}
          </p>
          <p>{t.ends}</p>
          <p>{t.email}</p>
        </div>
      </div>
    );
  }
  return (
    <form className={styles.form} onSubmit={withdraw}>
      <p className={styles.vat}>{t.effect}</p>
      <div className={styles.submit}>
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? t.busy : t.submit}
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error.text}{" "}
          {error.outside && <Link href={`/supporter/cancel?lang=${locale}`}>{t.cancelLink}</Link>}
        </p>
      )}
    </form>
  );
}
