"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "@/components/link";
import { Field } from "@/components/field";
import { WellSelect } from "@/components/well-select";
import { TurnstileChallenge } from "@/components/turnstile-challenge";
import {
  contactLimits,
  contactStatuses,
  contactTopics,
  type ContactStatus,
} from "@/lib/contact-fields";
import type { LegalLocale } from "@/lib/legal-language";
import account from "@/components/account.module.css";
import { contactCopy } from "./contact-copy";
import styles from "./contact.module.css";

const noSubscription = () => () => {};

/**
 * The contact form. A plain POST to /api/contact that answers with a redirect works without
 * JavaScript; with it, the form sends in place, keeps what was typed on an error and asks
 * Turnstile for a fresh token before a retry.
 */
export function ContactForm({
  locale,
  initialStatus,
}: {
  locale: LegalLocale;
  initialStatus?: ContactStatus;
}) {
  const copy = contactCopy(locale);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [status, setStatus] = useState<ContactStatus | undefined>(initialStatus);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [length, setLength] = useState(0);
  const result = useRef<HTMLParagraphElement>(null);
  const onToken = useCallback((value: string) => setToken(value), []);
  // False in the server render (and without JavaScript), so the button never starts disabled.
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  useEffect(() => {
    if (status) result.current?.focus();
  }, [status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    try {
      const body = new URLSearchParams();
      for (const [key, value] of new FormData(form))
        if (typeof value === "string") body.append(key, value);
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body,
      });
      const answer = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.ok) {
        form.reset();
        setLength(0);
        setStatus("sent");
      } else
        setStatus(
          contactStatuses.includes(answer.error as ContactStatus)
            ? (answer.error as ContactStatus)
            : "unavailable",
        );
    } catch {
      setStatus("unavailable");
    } finally {
      setPending(false);
      // A Turnstile token is good for one check: ask for a new one either way.
      setToken("");
      setAttempt((value) => value + 1);
    }
  }

  const waiting = hydrated && !!sitekey && !token;
  if (status === "sent")
    return (
      <div className={styles.form + " panel"}>
        <p ref={result} tabIndex={-1} role="status" className={account.saved}>
          {copy.status.sent}
        </p>
        <div className={styles.actions}>
          <button className="button secondary" type="button" onClick={() => setStatus(undefined)}>
            {copy.another}
          </button>
        </div>
      </div>
    );
  return (
    <form
      className={styles.form + " panel"}
      method="post"
      action="/api/contact"
      onSubmit={submit}
      aria-labelledby="contact-form-title"
    >
      <h2 id="contact-form-title">{copy.formTitle}</h2>
      <p className={styles.lead}>{copy.lead}</p>
      {status && (
        <p ref={result} tabIndex={-1} role="alert" className={account.alert}>
          {copy.status[status]}
        </p>
      )}
      <input type="hidden" name="lang" value={locale} />
      <div className={styles.grid}>
        <Field label={copy.name}>
          <input name="name" required maxLength={contactLimits.name} autoComplete="name" />
        </Field>
        <Field label={copy.email} hint={copy.emailHint}>
          <input
            name="email"
            type="email"
            required
            maxLength={contactLimits.email}
            autoComplete="email"
            spellCheck={false}
          />
        </Field>
        <Field label={copy.topic} wide>
          <WellSelect name="topic" defaultValue="general">
            {contactTopics.map((topic) => (
              <option key={topic} value={topic}>
                {copy.topics[topic]}
              </option>
            ))}
          </WellSelect>
        </Field>
        <Field
          label={copy.message}
          wide
          hint={
            <span className={styles.count} aria-live="off">
              {copy.messageHint(length, contactLimits.message)}
            </span>
          }
        >
          <textarea
            name="message"
            required
            minLength={contactLimits.minMessage}
            maxLength={contactLimits.message}
            rows={8}
            onChange={(event) => setLength(event.target.value.length)}
          />
        </Field>
      </div>
      <TurnstileChallenge
        onToken={onToken}
        attempt={attempt}
        action="contact"
        label={copy.verification}
        unavailable={copy.verificationUnavailable}
      />
      <p className={styles.note}>
        {copy.privacy[0]}
        <Link href={`/legal?lang=${locale}#privacy`}>{copy.privacy[1]}</Link>
        {copy.privacy[2]}
      </p>
      <div className={styles.actions}>
        <button className="button primary" type="submit" disabled={pending || waiting}>
          {pending ? copy.sending : waiting ? copy.verifying : copy.send}
        </button>
      </div>
    </form>
  );
}
