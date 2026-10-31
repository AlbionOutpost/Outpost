"use client";
import { useState } from "react";
import { ArrowRight, CreditCard } from "lucide-react";

/** Subscribe or manage: both hand the browser to Stripe's hosted pages. */
export function SupporterActions({
  region,
  mode,
}: {
  region: string;
  mode: "subscribe" | "manage";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        `/api/billing/${mode === "subscribe" ? "checkout" : "portal"}?region=${region}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
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
      <button
        type="button"
        className={`button ${mode === "subscribe" ? "primary" : "secondary"}`}
        disabled={busy}
        onClick={go}
      >
        {mode === "subscribe" ? (
          <>
            {busy ? "Opening checkout…" : "Become a Supporter"} <ArrowRight size={17} />
          </>
        ) : (
          <>
            <CreditCard size={16} /> {busy ? "Opening billing…" : "Manage subscription"}
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="supporter-error">
          {error}
        </p>
      )}
    </div>
  );
}
