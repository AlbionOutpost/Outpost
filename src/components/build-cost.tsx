"use client";
import { useEffect, useRef, useState } from "react";
import { useAtlasRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { sourceTimestamp } from "@/lib/albion/freshness";
import Link from "@/components/link";
type Cost = {
  region: string;
  city: string;
  sets: number;
  knownCost: number | null;
  total: number | null;
  stale: boolean;
  rows: {
    slot: string;
    itemId: string;
    quality: number;
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
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const requestKey = `${id}:${region}:${city}:${sets}`;
  const busy = pendingKey === requestKey;
  useEffect(() => () => controller.current?.abort(), [requestKey]);
  async function load() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const key = requestKey;
    setPendingKey(key);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(
        `/api/builds/${id}/cost?${new URLSearchParams({ region, city, sets: String(sets) })}`,
        { signal: AbortSignal.any([active.signal, AbortSignal.timeout(15000)]) },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (body.region !== region || body.city !== city || body.sets !== sets)
        throw new Error("Price selection changed. Estimate again for this market.");
      if (!active.signal.aborted) setResult(body);
    } catch (e) {
      if (!active.signal.aborted)
        setError({
          key,
          message: e instanceof Error ? e.message : "Could not estimate cost",
        });
    } finally {
      if (controller.current === active) setPendingKey(null);
    }
  }
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  // The first estimate runs when the section scrolls into view; later changes use the button.
  const root = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void loadRef.current();
      },
      { rootMargin: "200px" },
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [id, region]);
  return (
    <section className="panel section" ref={root}>
      <h2>Loadout replacement cost</h2>
      <p>
        Lowest observed sell orders, using each item&apos;s selected quality. One of each equipped
        item per set; no inferred consumable stack size. Region: {region}.
      </p>
      <form
        className="market-form"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label>
          Purchase city
          <select aria-label="Purchase city" value={city} onChange={(e) => setCity(e.target.value)}>
            {cities
              .filter((c) => c !== "Black Market")
              .map((c) => (
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
      {error?.key === requestKey && (
        <p role="alert" className="error">
          {error.message}
        </p>
      )}
      {result && result.region === region && result.city === city && result.sets === sets && (
        <>
          <h3>
            {result.knownCost === null
              ? "Estimate exceeds supported silver range"
              : result.total === null
                ? `Known subtotal · ${result.knownCost.toLocaleString()} silver`
                : `${result.total.toLocaleString()} silver`}
            {result.stale ? " · Check observation dates" : ""}
          </h3>
          <p className="muted">
            {result.rows.filter((row) => row.price !== null).length}/{result.rows.length} items
            priced. {result.total === null ? "The estimate is incomplete. " : ""}
            Older scans remain estimates; no missing item counts as free.{" "}
            <Link href={`/market-data?${new URLSearchParams({ region, city })}`}>
              How market scans work →
            </Link>
          </p>
          <ul className="equipment-summary">
            {result.rows.map((r) => (
              <li key={r.slot}>
                <strong>
                  {r.slot}: {equipmentName(r.itemId)}
                </strong>
                <span>
                  {r.price === null
                    ? `No sell listing observed in ${city}`
                    : `${r.price.toLocaleString()} per item`}
                </span>
                <small>
                  {r.observedAt && Number.isFinite(sourceTimestamp(r.observedAt))
                    ? `${new Date(sourceTimestamp(r.observedAt)).toLocaleString("en-GB", { timeZone: "UTC" })} UTC${r.stale ? " · STALE" : ""}`
                    : "No source observation"}
                </small>
                <Link
                  className="text-link"
                  href={`/tools/market?${new URLSearchParams({ region, item: r.itemId, quality: String(r.quality) })}`}
                >
                  Compare cities & qualities →
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
