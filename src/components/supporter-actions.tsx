"use client";
import { useState } from "react";
import { CreditCard } from "lucide-react";

/** Opens Stripe's billing portal (card, invoices). Ordering is the order box (`SupporterOrder`). */
export function SupporterActions({ region }: { region: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/billing/portal?region=${region}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await r.json();
      if (!r.ok || !body.url) throw new Error(body.error || "Billing is unavailable right now.");
      location.assign(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Billing is unavailable right now.");
      setBusy(false);
    }
  }
  return (
    <div className="supporter-actions">
      <button type="button" className="button secondary" disabled={busy} onClick={go}>
        <CreditCard size={16} /> {busy ? "Opening billing…" : "Manage subscription"}
      </button>
      {error && (
        <p role="alert" className="supporter-error">
          {error}
        </p>
      )}
    </div>
  );
}
