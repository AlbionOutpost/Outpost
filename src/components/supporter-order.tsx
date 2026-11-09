"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import Link from "@/components/link";
import {
  loadStripe,
  paymentMessage,
  readPaymentTokens,
  stripeAppearance,
  type PaymentElement,
  type StripeClient,
  type StripeElements,
} from "./stripe-payment";
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
    withdraw: "Withdrawal",
    withdrawLine: "Within 14 days of ordering, with a full refund.",
    withdrawLink: "Withdraw from contract",
    vat: "The price includes any VAT that applies.",
    vatSmall: "No VAT is charged (small business, § 19 UStG).",
    terms: (
      <>
        I agree to the <Link href="/legal?lang=en#supporter-terms">terms</Link> and have read the{" "}
        <Link href="/legal?lang=en#withdrawal">cancellation policy</Link>.
      </>
    ),
    start: "Continue to payment",
    starting: "Loading the payment form…",
    payment: "Payment",
    submit: "Subscribe and pay",
    busy: "Paying…",
    note: "Card details go straight to Stripe. Outpost never sees them.",
    noPrice: "The price could not be loaded. Try again in a minute.",
    failed: "Billing is unavailable right now.",
    loadFailed: "The payment form could not load. Check your connection and try again.",
    declined: "The payment did not go through. Try again or use another payment method.",
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
    withdraw: "Widerruf",
    withdrawLine: "Innerhalb von 14 Tagen nach der Bestellung, mit voller Erstattung.",
    withdrawLink: "Vertrag widerrufen",
    vat: "Der Preis enthält die gegebenenfalls anfallende Umsatzsteuer.",
    vatSmall: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    terms: (
      <>
        Ich stimme den <Link href="/legal?lang=de#supporter-terms">AGB</Link> zu und habe die{" "}
        <Link href="/legal?lang=de#withdrawal">Widerrufsbelehrung</Link> gelesen.
      </>
    ),
    start: "Weiter zur Zahlung",
    starting: "Zahlungsformular wird geladen…",
    payment: "Zahlung",
    submit: "Zahlungspflichtig bestellen",
    busy: "Zahlung läuft…",
    note: "Kartendaten gehen direkt an Stripe. Outpost sieht sie nie.",
    noPrice: "Der Preis konnte nicht geladen werden. Bitte in einer Minute erneut versuchen.",
    failed: "Die Abrechnung ist gerade nicht erreichbar.",
    loadFailed:
      "Das Zahlungsformular konnte nicht geladen werden. Prüfen Sie die Verbindung und versuchen Sie es erneut.",
    declined:
      "Die Zahlung ist nicht durchgegangen. Versuchen Sie es erneut oder wählen Sie eine andere Zahlungsart.",
    language: "Sprache",
  },
} as const;

type Form = { stripe: StripeClient; elements: StripeElements; element: PaymentElement };

/**
 * The order box (§ 312j BGB): what is bought, for how much and how long, how to cancel and
 * withdraw, one unticked box for the terms and the one button that orders. "Continue to payment"
 * sends the ticked box (the server records when) and gets one unpaid subscription's payment
 * secret; only then is Stripe.js loaded and its Payment Element shown, styled with Outpost's
 * tokens. "Subscribe and pay" confirms the payment with Stripe; 3-D Secure runs in Stripe's own
 * window. No waiver of the right of withdrawal is asked for: a withdrawal within 14 days is
 * always refunded in full. The plan itself changes only through Stripe's signed webhook.
 */
export function SupporterOrder({
  region,
  price,
  locale,
  smallBusiness,
  publishableKey,
  failed = false,
}: {
  region: string;
  /** The live Stripe price, already formatted for `locale`; null when it could not be read. */
  price: string | null;
  locale: "en" | "de";
  smallBusiness: boolean;
  /** Stripe's publishable key, read from the server's runtime configuration. */
  publishableKey: string;
  /** Stripe sent the buyer back after a payment that did not go through. */
  failed?: boolean;
}) {
  const t = copy[locale];
  const [terms, setTerms] = useState(false);
  const [secret, setSecret] = useState("");
  const [stage, setStage] = useState<"idle" | "starting" | "ready" | "paying">("idle");
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(failed ? t.declined : "");
  const mount = useRef<HTMLDivElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const form = useRef<Form | null>(null);
  const router = useRouter();

  // Mounts the Payment Element once the order has its payment secret.
  useEffect(() => {
    const target = mount.current;
    if (!secret || !target) return;
    let live = true;
    let element: PaymentElement | undefined;
    let watch: MutationObserver | undefined;
    loadStripe()
      .then((factory) => {
        if (!live) return;
        const theme = target.closest(".app") ?? document.documentElement;
        const appearance = () => stripeAppearance(readPaymentTokens(target));
        const stripe = factory(publishableKey, { locale });
        const elements = stripe.elements({
          clientSecret: secret,
          appearance: appearance(),
          locale,
        });
        element = elements.create("payment", { layout: "tabs" });
        element.on("ready", () => {
          if (!live) return;
          setStage("ready");
          element?.focus();
        });
        element.on("change", (event) => setComplete(event.complete));
        element.on("loaderror", () => {
          if (!live) return;
          setError(t.loadFailed);
          setStage("idle");
          setSecret("");
        });
        element.mount(target);
        form.current = { stripe, elements, element };
        // The site's theme switch restyles the form in place.
        watch = new MutationObserver(() => elements.update({ appearance: appearance() }));
        watch.observe(theme, { attributes: true, attributeFilter: ["class"] });
      })
      .catch(() => {
        if (!live) return;
        setError(t.loadFailed);
        setStage("idle");
        setSecret("");
      });
    return () => {
      live = false;
      watch?.disconnect();
      element?.destroy();
      form.current = null;
    };
  }, [secret, publishableKey, locale, t.loadFailed]);

  async function start() {
    setStage("starting");
    setError("");
    // Stripe.js starts loading while the server prepares the order.
    loadStripe().catch(() => undefined);
    try {
      const r = await fetch(`/api/billing/checkout?region=${region}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || typeof body.clientSecret !== "string") throw new Error(body.error || t.failed);
      setSecret(body.clientSecret);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
      setStage("idle");
    }
  }

  async function pay() {
    const current = form.current;
    if (!current) return;
    setStage("paying");
    setError("");
    const done = `/supporter?region=${region}&lang=${locale}&checkout=success`;
    try {
      const result = await current.stripe.confirmPayment({
        elements: current.elements,
        confirmParams: { return_url: `${location.origin}${done}` },
        redirect: "if_required",
      });
      const status = result.paymentIntent?.status;
      if (!result.error && (status === "succeeded" || status === "processing"))
        return router.push(done);
      setError(result.error ? paymentMessage(result.error, t.declined) : t.declined);
    } catch {
      setError(t.declined);
    }
    setStage("ready");
    // The order button was disabled while paying; keyboard users continue from the message.
    requestAnimationFrame(() => alert.current?.focus());
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!terms) return;
    if (stage === "idle") void start();
    else if (stage === "ready" && complete) void pay();
  }

  const open = stage !== "idle" || !!secret;
  const busy = stage === "starting" || stage === "paying";
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
        <div className="well">
          <dt>{t.withdraw}</dt>
          <dd>
            {t.withdrawLine}{" "}
            <Link href={`/supporter/withdraw?lang=${locale}`}>{t.withdrawLink}</Link>
          </dd>
        </div>
      </dl>
      <p className={styles.vat}>{smallBusiness ? t.vatSmall : t.vat}</p>
      <form className={styles.form} onSubmit={submit} aria-busy={busy}>
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
        {open && (
          <fieldset className={styles.payment} disabled={stage === "paying"}>
            <legend>{t.payment}</legend>
            {stage === "starting" && (
              <p role="status" className={styles.loading}>
                {t.starting}
              </p>
            )}
            <div ref={mount} className={styles.element} />
          </fieldset>
        )}
        <div className={styles.submit}>
          {open ? (
            <button
              type="submit"
              className="button primary"
              disabled={stage !== "ready" || !terms || !complete}
            >
              {stage === "paying" ? t.busy : t.submit} <Lock size={16} aria-hidden="true" />
            </button>
          ) : (
            <button type="submit" className="button primary" disabled={!price || !terms}>
              {t.start} <ArrowRight size={17} aria-hidden="true" />
            </button>
          )}
          <span className={styles.note}>
            <Lock size={14} aria-hidden="true" /> {t.note}
          </span>
        </div>
        {!price && <p className={styles.error}>{t.noPrice}</p>}
        <p ref={alert} role="alert" tabIndex={-1} className={styles.error} hidden={!error}>
          {error}
        </p>
      </form>
    </section>
  );
}
