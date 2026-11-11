"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

export function TurnstileChallenge({
  onToken,
  attempt,
  action = "community_write",
  label = "Bot verification",
  unavailable = "Verification could not load. Please retry or check your connection.",
}: {
  onToken: (token: string) => void;
  attempt: number;
  /** The siteverify action the server expects (`verifyTurnstile`). */
  action?: "community_write" | "contact";
  label?: string;
  unavailable?: string;
}) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!sitekey || !ready || !container.current || !window.turnstile) return;
    const turnstile = window.turnstile;
    const id = turnstile.render(container.current, {
      sitekey,
      action,
      theme: "auto",
      size: "flexible",
      callback: (token: string) => {
        setError("");
        onToken(token);
      },
      "expired-callback": () => onToken(""),
      "error-callback": () => {
        onToken("");
        setError(unavailable);
      },
    });
    return () => turnstile.remove(id);
  }, [sitekey, ready, attempt, onToken, action, unavailable]);
  if (!sitekey) return null;
  return (
    <div className="section" aria-label={label}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setError(unavailable)}
      />
      <div ref={container} />
      {error && <p role="status">{error}</p>}
    </div>
  );
}
