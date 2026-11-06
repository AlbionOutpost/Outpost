"use client";
import { useEffect, useRef, useState } from "react";
import { useOutpostRegion } from "./region-context";
import { cities, regions } from "@/lib/albion/region-config";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { sourceTimestamp } from "@/lib/albion/freshness";
import Link from "@/components/link";
import { PanelHead } from "./panel-head";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
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
  const region = useOutpostRegion();
  const [city, setCity] = useState("Lymhurst");
  const [sets, setSets] = useState(1);
  const [result, setResult] = useState<Cost | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const requestKey = `${id}:${region}:${city}:${sets}`;
  const busy = pendingKey === requestKey;
  const failed = error?.key === requestKey;
  // A result only stands for the market it was asked for.
  const shown =
    result && result.region === region && result.city === city && result.sets === sets
      ? result
      : null;
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
    <section className="panel build-cost-panel" ref={root}>
      <PanelHead
        title="What will this loadout cost?"
        line={`Lowest sell order for each equipped item at its quality, in the city you pick on the ${regions[region].label} server.`}
        actions={
          <form
            className="loadout-quote-actions build-cost-form"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <label>
              <span className="sr-only">Purchase city</span>
              <WellSelect
                aria-label="Purchase city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                {cities
                  .filter((c) => c !== "Black Market")
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
              </WellSelect>
            </label>
            <label className="build-cost-sets">
              <span>Sets</span>
              <input
                type="number"
                min={1}
                max={1000}
                required
                value={sets}
                aria-label="Sets"
                onChange={(e) => setSets(Number(e.target.value))}
              />
            </label>
            <button className="button secondary" disabled={busy}>
              {busy ? "Checking prices…" : "Check loadout prices"}
            </button>
          </form>
        }
      />
      <div className="loadout-price-total" aria-live="polite">
        <div className="build-cost-figure">
          <small>
            Loadout total in {city}
            {sets > 1 && ` · ${sets} sets`}
          </small>
          <strong className="build-cost-total">
            {!shown ? (
              <Unavailable
                label={failed ? "Unavailable" : busy ? "Checking…" : "Not checked yet"}
              />
            ) : shown.knownCost === null ? (
              <Unavailable label="Estimate exceeds supported silver range" />
            ) : shown.total === null ? (
              `${shown.knownCost.toLocaleString()} silver known`
            ) : (
              `${shown.total.toLocaleString()} silver`
            )}
          </strong>
        </div>
        <div className="build-cost-figure">
          <small>Items priced</small>
          <strong>
            {shown ? (
              `${shown.rows.filter((row) => row.price !== null).length}/${shown.rows.length}`
            ) : (
              <Unavailable />
            )}
          </strong>
        </div>
        <StatusLine tone={shown?.stale ? "stale" : "default"}>
          {failed
            ? "Prices could not load right now. Try the check again in a moment."
            : busy
              ? `Checking prices in ${city}…`
              : shown
                ? `${shown.total === null ? "Items without a price are left out. " : ""}${shown.stale ? "Some scans are old; check their dates. " : ""}Prices are player scans and can be out of date.`
                : "Pick a city and check prices. Prices are player scans and can be out of date."}
        </StatusLine>
      </div>
      {shown && (
        <details>
          <summary>Individual item observations</summary>
          <ul className="build-cost-rows">
            {shown.rows.map((r) => (
              <li key={r.slot}>
                <strong>
                  {r.slot}: {equipmentName(r.itemId)}
                </strong>
                <span>
                  {r.price === null ? (
                    <Unavailable label={`No sell order in ${city}`} />
                  ) : (
                    `${r.price.toLocaleString()} per item`
                  )}
                </span>
                <small>
                  {r.observedAt && Number.isFinite(sourceTimestamp(r.observedAt))
                    ? `${new Date(sourceTimestamp(r.observedAt)).toLocaleString("en-GB", { timeZone: "UTC" })} UTC${r.stale ? " · Stale" : ""}`
                    : "No scan"}
                </small>
                <Link
                  className="pill-link is-small"
                  href={`/tools/market?${new URLSearchParams({ region, item: r.itemId, quality: String(r.quality) })}`}
                >
                  Compare cities
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="library-provenance">
        Prices from the Albion Online Data Project, scanned by players. Items without a price are
        left out of the total.{" "}
        <Link
          className="pill-link is-small"
          href={`/market-data?${new URLSearchParams({ region, city })}`}
        >
          How market scans work
        </Link>
      </p>
    </section>
  );
}
