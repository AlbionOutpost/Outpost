"use client";
import "./market-explorer.css";
import Link from "@/components/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useOutpostRegion } from "./region-context";
import type { MarketPrice } from "@/lib/albion/market-client";
import { sourceTimestamp } from "@/lib/albion/freshness";
import { summarizeQuotes } from "@/lib/albion/quote-summary";
import { cities } from "@/lib/albion/region-config";
import { MarketQuoteHero } from "./market-quote-hero";
import { MarketCityTable } from "./market-city-table";
import { EmptyWell } from "./empty-well";
import { PanelHead } from "./panel-head";
import { marketPriceCache, withSignal } from "@/lib/client-json-cache";

type State =
  | { status: "loading"; key: string }
  | { status: "error"; key: string }
  | { status: "ready"; key: string; rows: MarketPrice[]; at: number };

/**
 * Normal-quality city orders for one item, loaded on arrival so the item page answers "what
 * does it cost" without a detour. It is Market Explorer's hero figures and City orders table,
 * so the same observation reads the same on both pages.
 */
export function ItemPricePanel({ id, name }: { id: string; name: string }) {
  const region = useOutpostRegion();
  const quality = 1;
  const [attempt, setAttempt] = useState(0);
  const key = `${region}:${id}:${quality}:${attempt}`;
  const [settled, setSettled] = useState<State | null>(null);
  // A stale key means a new selection is in flight; the old answer is never shown for it.
  const state: State = settled && settled.key === key ? settled : { status: "loading", key };
  const [selectedCity, setSelectedCity] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    // Shared with Market Explorer: opening the item there reuses this answer. Try again asks anew.
    withSignal(
      marketPriceCache.get(
        `/api/market?${new URLSearchParams({ region, item: id, quality: String(quality) })}`,
        { fresh: attempt > 0 },
      ),
      controller.signal,
    )
      .then((answer) => {
        const data = answer as { region: string; prices: MarketPrice[] };
        if (data.region !== region) throw new Error("Source region mismatch");
        setSettled({ status: "ready", key, rows: data.prices as MarketPrice[], at: Date.now() });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setSettled({ status: "error", key });
      });
    return () => controller.abort();
  }, [region, id, key, attempt]);
  const ready = state.status === "ready";
  const rows = ready ? state.rows.toSorted((a, b) => a.city.localeCompare(b.city)) : [];
  const now = ready ? state.at : 0;
  const summary = summarizeQuotes(rows, now || undefined);
  const newest = rows
    .flatMap((r) => [
      ...(r.sell_price_min ? [{ city: r.city, date: r.sell_price_min_date }] : []),
      ...(r.buy_price_max ? [{ city: r.city, date: r.buy_price_max_date }] : []),
    ])
    .filter((o) => Number.isFinite(sourceTimestamp(o.date)))
    .reduce<{ city: string; date: string } | null>(
      (best, o) => (!best || sourceTimestamp(o.date) > sourceTimestamp(best.date) ? o : best),
      null,
    );
  return (
    <section
      className="raised item-panel item-price-panel mx is-item"
      aria-labelledby="item-prices-heading"
      aria-busy={state.status === "loading"}
    >
      <PanelHead
        id="item-prices-heading"
        title="Market prices"
        line={
          ready && summary.available
            ? `${summary.stale} of ${summary.available} orders older than an hour · Normal quality`
            : "Normal quality · the newest order seen in each city"
        }
        actions={
          <Link
            className="pill-link is-small"
            href={`/tools/market?${new URLSearchParams({ item: id, region })}`}
          >
            Other qualities and history <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />
      <MarketQuoteHero
        item={id}
        name={name}
        quality={String(quality)}
        region={region}
        scope="All cities"
        summary={ready ? { ask: summary.ask, bid: summary.bid } : null}
        newest={newest}
        status={
          state.status === "loading" ? "Checking the markets…" : "Prices could not load right now."
        }
        failed={state.status === "error"}
        loading={state.status === "loading"}
        onRetry={() => setAttempt((n) => n + 1)}
        now={now}
      />
      <div className="market-board">
        {ready && !summary.available ? (
          <EmptyWell
            title="No orders seen for this item yet"
            line="Prices appear once a player running the Albion Online Data Project client opens this market. A gap is not a zero price."
            action={
              <Link
                className="pill-link is-small"
                href={`/market-data?${new URLSearchParams({ region, item: id })}`}
              >
                Fill a missing price <ArrowRight size={15} aria-hidden="true" />
              </Link>
            }
          />
        ) : (
          <MarketCityTable
            rows={
              ready
                ? rows
                : cities
                    .toSorted((a, b) => a.localeCompare(b))
                    .map((city) => ({
                      item_id: id,
                      city,
                      quality,
                      sell_price_min: 0,
                      sell_price_min_date: "",
                      buy_price_max: 0,
                      buy_price_max_date: "",
                    }))
            }
            ask={summary.ask}
            bid={summary.bid}
            selectedCity={selectedCity}
            onSelect={setSelectedCity}
            missingLabel={ready ? undefined : "Unavailable"}
            loading={state.status === "loading"}
            now={now}
          />
        )}
      </div>
      <p className="mx-source">
        Albion Online Data Project · sell orders are listings, buy orders are offers · an amber age
        and ring mark an order older than an hour (stale) · times in UTC
      </p>
    </section>
  );
}
