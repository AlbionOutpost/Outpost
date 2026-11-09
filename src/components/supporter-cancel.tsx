"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import styles from "./supporter-order.module.css";

type Locale = "en" | "de";
const copy = {
  en: {
    kind: "Type of cancellation",
    ordinary: "Ordinary, to the end of the paid month",
    extraordinary: "Extraordinary, for an important reason",
    reason: "Your reason",
    reasonHint: "Needed for an extraordinary cancellation.",
    submit: "Cancel now",
    busy: "Cancelling…",
    failed:
      "The cancellation did not go through. Try again, or write to contact@albionoutpost.com.",
    done: "Cancellation received",
    received: "Received on",
    ends: "Your plan ends on",
    endsUnknown: "Your plan ends at the end of the paid month.",
    keep: "Until then you keep every Supporter benefit, and nothing is charged again.",
    review:
      "We review an extraordinary cancellation and answer by email. Either way, the plan no longer renews.",
    email: "Stripe emails you a confirmation. You can also print or save this page.",
  },
  de: {
    kind: "Art der Kündigung",
    ordinary: "Ordentlich, zum Ende des bezahlten Monats",
    extraordinary: "Außerordentlich, aus wichtigem Grund",
    reason: "Ihr Kündigungsgrund",
    reasonHint: "Für eine außerordentliche Kündigung erforderlich.",
    submit: "Jetzt kündigen",
    busy: "Wird gekündigt…",
    failed:
      "Die Kündigung ist nicht durchgegangen. Bitte erneut versuchen oder an contact@albionoutpost.com schreiben.",
    done: "Kündigung eingegangen",
    received: "Eingegangen am",
    ends: "Ihr Plan endet am",
    endsUnknown: "Ihr Plan endet zum Ende des bezahlten Monats.",
    keep: "Bis dahin bleiben alle Supporter-Vorteile, und es wird nichts mehr abgebucht.",
    review:
      "Eine außerordentliche Kündigung prüfen wir und antworten per E-Mail. Der Plan verlängert sich in keinem Fall mehr.",
    email:
      "Stripe schickt Ihnen eine Bestätigung per E-Mail. Sie können diese Seite auch drucken oder speichern.",
  },
} as const;

const when = (iso: string, locale: Locale, time: boolean) =>
  new Date(iso).toLocaleString(locale === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit", timeZoneName: "short" } : {}),
    timeZone: "Europe/Berlin",
  });

/**
 * The § 312k BGB confirmation form: the kind of cancellation (a reason for an extraordinary
 * one) and the "Jetzt kündigen" button. The server finds the subscription from the signed-in
 * account; the form names none. The result shows when it was received and when the plan ends.
 */
export function SupporterCancel({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [kind, setKind] = useState<"ordinary" | "extraordinary">("ordinary");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    receivedAt: string;
    endsAt: string | null;
    kind: string;
  } | null>(null);
  async function cancel(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "ordinary" ? { kind } : { kind, reason: reason.trim() || undefined },
        ),
      });
      const body = await r.json();
      if (!r.ok || !body.receivedAt) throw new Error(body.error || t.failed);
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className={`well ${styles.done}`} role="status" data-cancel-result="">
        <CheckCircle2 size={24} aria-hidden="true" />
        <div>
          <h2>{t.done}</h2>
          <p>
            {t.received} <strong>{when(result.receivedAt, locale, true)}</strong>.{" "}
            {result.endsAt ? (
              <>
                {t.ends} <strong>{when(result.endsAt, locale, false)}</strong>.
              </>
            ) : (
              t.endsUnknown
            )}
          </p>
          <p>{result.kind === "extraordinary" ? t.review : t.keep}</p>
          <p>{t.email}</p>
        </div>
      </div>
    );
  return (
    <form className={styles.form} onSubmit={cancel}>
      <fieldset className={styles.fieldset}>
        <legend>{t.kind}</legend>
        <label className={styles.check}>
          <input
            type="radio"
            name="kind"
            value="ordinary"
            checked={kind === "ordinary"}
            onChange={() => setKind("ordinary")}
          />
          <span>{t.ordinary}</span>
        </label>
        <label className={styles.check}>
          <input
            type="radio"
            name="kind"
            value="extraordinary"
            checked={kind === "extraordinary"}
            onChange={() => setKind("extraordinary")}
          />
          <span>{t.extraordinary}</span>
        </label>
      </fieldset>
      {kind === "extraordinary" && (
        <label className={styles.field}>
          <span>{t.reason}</span>
          <textarea
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={3}
            maxLength={1000}
            required
            aria-describedby="cancel-reason-hint"
          />
          <small id="cancel-reason-hint">{t.reasonHint}</small>
        </label>
      )}
      <div className={styles.submit}>
        <button type="submit" className="button primary" disabled={busy}>
          {busy ? t.busy : t.submit}
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}
