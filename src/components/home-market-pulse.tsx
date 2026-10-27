"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCw, Pause, Play } from "lucide-react";
import { useVisibleRefresh } from "./use-visible-refresh";
import { useAtlasRegion } from "./region-context";
import { ItemIcon } from "./item-icon";
import {
  parseMarketPreview,
  observationLabel,
  type PreviewPrice,
} from "@/lib/albion/market-preview";

const items = [
  { id: "T4_MAIN_AXE", name: "Battleaxe" },
  { id: "T4_BAG", name: "Adept’s Bag" },
  { id: "T4_CAPE", name: "Adept’s Cape" },
  { id: "T4_POTION_HEAL", name: "Healing Potion" },
];
type Observation = {
  id: string;
  row: PreviewPrice | null;
  error: boolean;
  checkedAt: string | null;
};
export function HomeMarketPulse() {
  const region = useAtlasRegion();
  const { revision, paused, setPaused, refresh } = useVisibleRefresh();
  const [result, setResult] = useState<{
    region: string;
    revision: number;
    values: Observation[];
  } | null>(null);
  const values = result?.region === region ? result.values : [];
  const busy = result?.region !== region || result.revision !== revision;
  useEffect(() => {
    const request = new AbortController();
    let timedOut = false;
    let disposed = false;
    const timer = setTimeout(() => {
      timedOut = true;
      request.abort();
    }, 10000);
    Promise.all(
      items.map(async (item) => {
        try {
          const response = await fetch(
            `/api/market?${new URLSearchParams({ region, item: item.id, quality: "1", view: "pulse" })}`,
            { signal: request.signal },
          );
          if (!response.ok) throw new Error();
          const rows = parseMarketPreview(await response.json(), region, item.id);
          const row = rows.find((row) => row.city === "Lymhurst") ?? null;
          return { id: item.id, row, error: false, checkedAt: new Date().toISOString() };
        } catch {
          return { id: item.id, row: null, error: true, checkedAt: null };
        }
      }),
    )
      .then((observations) => {
        if (disposed || (request.signal.aborted && !timedOut)) return;
        setResult((previous) => ({
          region,
          revision,
          values: observations.map((value) => {
            if (value.error && previous?.region === region) {
              const prior = previous.values.find((p) => p.id === value.id);
              if (prior) return { ...prior, error: true };
            }
            return value;
          }),
        }));
      })
      .finally(() => clearTimeout(timer));
    return () => {
      disposed = true;
      clearTimeout(timer);
      request.abort();
    };
  }, [region, revision]);
  return (
    <section className="home-market-pulse" aria-labelledby="pulse-heading" aria-busy={busy}>
      <div className="market-pulse-heading">
        <div>
          <h2 id="pulse-heading">Market snapshot</h2>
          <span>Lymhurst · T4 · Normal quality</span>
        </div>
        <div className="pulse-controls">
          <span>{paused ? "Refresh paused" : "Checks every 60s"}</span>
          <button
            type="button"
            aria-label={paused ? "Resume snapshot refresh" : "Pause snapshot refresh"}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
          <button
            type="button"
            aria-label="Refresh market snapshot"
            disabled={busy}
            onClick={refresh}
          >
            <RefreshCw size={14} />
          </button>
          <Link href={`/tools/market?region=${region}`}>
            View market <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
      <div className="market-pulse-items">
        {items.map((item) => {
          const observation = values.find((value) => value.id === item.id);
          const price = observation?.row?.sell_price_min ?? 0;
          const freshness = observationLabel(price, observation?.row?.sell_price_min_date ?? "");
          return (
            <Link
              className="market-pulse-item"
              data-item={item.id}
              key={item.id}
              href={`/tools/market?region=${region}&item=${item.id}`}
            >
              <ItemIcon id={item.id} size={48} />
              <div>
                <strong>{item.name}</strong>
                <span className="numeric">
                  {!observation
                    ? "Loading…"
                    : price > 0
                      ? price.toLocaleString("en-GB", { maximumFractionDigits: 20 })
                      : "Unavailable"}
                  <small> sell listing</small>
                </span>
                <span className="pulse-freshness" title={freshness.dateTime ?? undefined}>
                  {observation?.error ? "Refresh unavailable · " : ""}
                  {observation ? freshness.label : "Requesting source"}
                  {freshness.dateTime && (
                    <time dateTime={freshness.dateTime}>
                      {freshness.dateTime.slice(5, 16).replace("T", " ")} UTC
                    </time>
                  )}
                </span>
              </div>
              <ArrowUpRight size={14} />
            </Link>
          );
        })}
      </div>
      <p className="pulse-source-note">
        Albion Online Data Project · price cache up to 60 seconds. Checks do not guarantee new
        observations or executable prices.
      </p>
    </section>
  );
}
