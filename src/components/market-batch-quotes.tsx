"use client";
import { useEffect, useRef, useState } from "react";
import { fetchQuoteBatch, type QuoteSelection, type MarketPrice } from "@/lib/albion/market-quotes";
import { summarizeQuotes } from "@/lib/albion/quote-summary";
import { isStale, sourceTimestamp } from "@/lib/albion/freshness";
export function quoteKey(i: QuoteSelection) {
  return `${i.itemId}:${i.quality}`;
}
type Quote = { prices: MarketPrice[]; error?: string };
export function useBatchQuotes(region: string) {
  const [state, setState] = useState<{ region: string; quotes: Record<string, Quote> }>({
    region,
    quotes: {},
  });
  const [pending, setPending] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), [region]);
  async function refresh(items: QuoteSelection[]) {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setPending(region);
    try {
      const result = await fetchQuoteBatch(region, items, active.signal);
      if (active.signal.aborted) return;
      setState((previous) => {
        const activeKeys = new Set(items.map(quoteKey));
        const quotes =
          previous.region === region
            ? Object.fromEntries(
                Object.entries(previous.quotes).filter(([key]) => activeKeys.has(key)),
              )
            : {};
        for (const row of result) {
          const key = quoteKey(row);
          quotes[key] = row.error ? { ...(quotes[key] || { prices: [] }), error: row.error } : row;
        }
        return { region, quotes };
      });
    } catch (error) {
      if (!active.signal.aborted)
        console.error(
          "Quote refresh could not start",
          error instanceof Error ? error.name : "Error",
        );
    } finally {
      if (controller.current === active) setPending(null);
    }
  }
  return { quotes: state.region === region ? state.quotes : {}, busy: pending === region, refresh };
}
export function BatchQuote({ quote }: { quote?: Quote }) {
  if (!quote) return <span className="muted">Not loaded</span>;
  const { ask, bid } = summarizeQuotes(quote.prices);
  function side(row: MarketPrice | null, kind: "sell" | "buy") {
    if (!row) return <span>No {kind === "sell" ? "sell listings" : "buy orders"} observed</span>;
    const date = kind === "sell" ? row.sell_price_min_date : row.buy_price_max_date;
    const stamp = sourceTimestamp(date);
    return (
      <span>
        <strong>
          {(kind === "sell" ? row.sell_price_min : row.buy_price_max).toLocaleString()} silver
        </strong>{" "}
        · {row.city}
        <small>
          {isStale(date) ? "Stale" : "Recent"} ·{" "}
          {Number.isFinite(stamp)
            ? new Date(stamp).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC"
            : "Observation time unknown"}
        </small>
      </span>
    );
  }
  return (
    <div className="batch-quote">
      {quote.error && (
        <small role="status">
          {quote.error}{" "}
          {quote.prices.length > 0
            ? "Last observations retained below."
            : "No observations loaded."}
        </small>
      )}
      {!quote.prices.length ? (
        quote.error ? null : (
          <span>No observations returned. Try another quality or open city prices.</span>
        )
      ) : (
        <>
          <span className="muted">Lowest sell listing</span>
          {side(ask, "sell")}
          <span className="muted">Highest buy order</span>
          {side(bid, "buy")}
        </>
      )}
    </div>
  );
}
