"use client";
import { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import Link from "@/components/link";
import styles from "./supporter-order.module.css";

const copy = {
  en: {
    title: "Your order",
    plan: "Plan",
    price: "Price",
    priceMissing: "Unavailable",
    term: "Term",
    termLine: "Renews every month until you cancel. No minimum term.",
    cancel: "Cancelling",
    cancelLine: "Any time, to the end of the paid month.",
    cancelLink: "Cancel subscription",
    vat: "The total, with any VAT that applies, is shown again on Stripe before you pay.",
    vatSmall: "No VAT is charged (small business, § 19 UStG).",
    terms: (
      <>
        I agree to the <Link href="/legal?lang=en#supporter-terms">terms</Link> and have read the{" "}
        <Link href="/legal?lang=en#withdrawal">cancellation policy</Link>.
      </>
    ),
    immediate:
      "Start my Supporter plan right away, before the 14-day withdrawal period ends. I know that my right of withdrawal expires once the plan has started.",
    submit: "Subscribe and pay",
    busy: "Opening checkout…",
    note: "You pay on Stripe. Outpost never sees your card.",
    noPrice: "The price could not be loaded. Try again in a minute.",
    failed: "Billing is unavailable right now.",
    language: "Language",
  },
  de: {
    title: "Ihre Bestellung",
    plan: "Plan",
    price: "Preis",
    priceMissing: "Nicht verfügbar",
    term: "Laufzeit",
    termLine: "Verlängert sich jeden Monat, bis Sie kündigen. Keine Mindestlaufzeit.",
    cancel: "Kündigung",
    cancelLine: "Jederzeit zum Ende des bezahlten Monats.",
    cancelLink: "Verträge hier kündigen",
    vat: "Den Gesamtpreis mit etwaiger Umsatzsteuer zeigt Stripe vor dem Bezahlen noch einmal an.",
    vatSmall: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    terms: (
      <>
        Ich stimme den <Link href="/legal?lang=de#supporter-terms">AGB</Link> zu und habe die{" "}
        <Link href="/legal?lang=de#withdrawal">Widerrufsbelehrung</Link> gelesen.
      </>
    ),
    immediate:
      "Ich verlange, dass mein Supporter-Plan sofort und vor Ablauf der 14-tägigen Widerrufsfrist beginnt. Mir ist bekannt, dass mein Widerrufsrecht mit Beginn der Leistung erlischt.",
    submit: "Zahlungspflichtig bestellen",
    busy: "Checkout wird geöffnet…",
    note: "Sie bezahlen bei Stripe. Outpost sieht Ihre Karte nie.",
    noPrice: "Der Preis konnte nicht geladen werden. Bitte in einer Minute erneut versuchen.",
    failed: "Die Abrechnung ist gerade nicht erreichbar.",
    language: "Sprache",
  },
} as const;

/**
 * The order box (§ 312j BGB): what is bought, for how much and how long, two unticked boxes
 * (terms; immediate start with the withdrawal acknowledgment) and the one button that orders.
 * The server checks both boxes again and records when they were ticked.
 */
export function SupporterOrder({
  region,
  price,
  locale,
  smallBusiness,
}: {
  region: string;
  /** The live Stripe price, already formatted for `locale`; null when it could not be read. */
  price: string | null;
  locale: "en" | "de";
  smallBusiness: boolean;
}) {
  const t = copy[locale];
  const [terms, setTerms] = useState(false);
  const [immediate, setImmediate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function order(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/billing/checkout?region=${region}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms, immediateStart: immediate }),
      });
      const body = await r.json();
      if (!r.ok || !body.url) throw new Error(body.error || t.failed);
      location.assign(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
      setBusy(false);
    }
  }
  return (
    <section
      id="supporter-order"
      className={`raised ${styles.order}`}
      aria-labelledby="supporter-order-title"
      lang={locale}
    >
      <div className={styles.head}>
        <h2 id="supporter-order-title">{t.title}</h2>
        <nav className={styles.languages} aria-label={t.language}>
          {(
            [
              ["en", "English"],
              ["de", "Deutsch"],
            ] as const
          ).map(([code, label]) => (
            <a
              key={code}
              href={`/supporter?region=${region}&lang=${code}#supporter-order`}
              hrefLang={code}
              lang={code}
              aria-current={code === locale ? "true" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
      <dl className={styles.summary}>
        <div className="well">
          <dt>{t.plan}</dt>
          <dd>Outpost Supporter</dd>
        </div>
        <div className="well">
          <dt>{t.price}</dt>
          <dd className={styles.price}>
            {price ?? (
              <span className={styles.missing}>
                — <small>{t.priceMissing}</small>
              </span>
            )}
          </dd>
        </div>
        <div className="well">
          <dt>{t.term}</dt>
          <dd>{t.termLine}</dd>
        </div>
        <div className="well">
          <dt>{t.cancel}</dt>
          <dd>
            {t.cancelLine} <Link href={`/supporter/cancel?lang=${locale}`}>{t.cancelLink}</Link>
          </dd>
        </div>
      </dl>
      <p className={styles.vat}>{smallBusiness ? t.vatSmall : t.vat}</p>
      <form className={styles.form} onSubmit={order}>
        <label className={styles.check}>
          <input
            type="checkbox"
            name="terms"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            required
          />
          <span>{t.terms}</span>
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            name="immediateStart"
            checked={immediate}
            onChange={(e) => setImmediate(e.target.checked)}
            required
          />
          <span>{t.immediate}</span>
        </label>
        <div className={styles.submit}>
          <button
            type="submit"
            className="button primary"
            disabled={busy || !price || !terms || !immediate}
          >
            {busy ? t.busy : t.submit} <ArrowRight size={17} aria-hidden="true" />
          </button>
          <span className={styles.note}>
            <Lock size={14} aria-hidden="true" /> {t.note}
          </span>
        </div>
        {!price && <p className={styles.error}>{t.noPrice}</p>}
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
