"use client";
import { useState } from "react";
import { useAtlasRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
type Cost = {
  region: string;
  city: string;
  sets: number;
  knownCost: number;
  total: number | null;
  stale: boolean;
  rows: {
    slot: string;
    itemId: string;
    price: number | null;
    observedAt: string | null;
    stale: boolean;
  }[];
};
export function BuildCost({ id }: { id: string }) {
  const region = useAtlasRegion();
  const [city, setCity] = useState("Lymhurst");
  const [sets, setSets] = useState(1);
  const [result, setResult] = useState<Cost | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel section">
      <h2>Loadout replacement cost</h2>
      <p>
        Lowest observed sell orders, using each item&apos;s selected quality. One of each equipped
        item per set; no inferred consumable stack size. Region: {region}.
      </p>
      <form
        className="market-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setResult(null);
          try {
            const response = await fetch(
              `/api/builds/${id}/cost?${new URLSearchParams({ region, city, sets: String(sets) })}`,
            );
            const body = await response.json();
            if (!response.ok) throw new Error(body.error);
            setResult(body);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not estimate cost");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Purchase city
          <select aria-label="Purchase city" value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Replacement sets
          <input
            type="number"
            min={1}
            max={1000}
            required
            value={sets}
            onChange={(e) => setSets(Number(e.target.value))}
          />
        </label>
        <button className="button secondary" disabled={busy}>
          {busy ? "Fetching prices…" : "Estimate build cost"}
        </button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {result && result.region === region && result.city === city && result.sets === sets && (
        <>
          <h3>
            {result.total === null
              ? `Incomplete estimate · known subtotal ${result.knownCost.toLocaleString()}`
              : `${result.total.toLocaleString()} silver`}
            {result.stale ? " · STALE OBSERVATIONS" : ""}
          </h3>
          <p className="muted">
            Missing observations stay unavailable; an incomplete subtotal is not a complete loadout
            price.
          </p>
          <ul className="equipment-summary">
            {result.rows.map((r) => (
              <li key={r.slot}>
                <strong>
                  {r.slot}: {r.itemId}
                </strong>
                <span>
                  {r.price === null ? "Unavailable" : `${r.price.toLocaleString()} per item`}
                </span>
                <small>
                  {r.observedAt
                    ? `${r.observedAt} UTC${r.stale ? " · STALE" : ""}`
                    : "No source observation"}
                </small>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
