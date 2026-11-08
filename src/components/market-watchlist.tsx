"use client";
import { useEffect, useState } from "react";
import { Eye, TrendingDown, TrendingUp } from "lucide-react";
import Link from "@/components/link";
import { watchResponse } from "@/lib/market-watch";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { ItemIcon } from "./item-icon";
import { BatchQuote, quoteKey, useBatchQuotes } from "./market-batch-quotes";
import {
  readSeen,
  seenKey,
  seenSnapshot,
  sideChange,
  writeSeen,
  type SeenEntry,
  type SeenMap,
  type SideChange,
} from "@/lib/watch-seen";
import { sourceAge } from "@/lib/albion/source-age";
import type { z } from "zod";

/** One side's move since the player last marked the watchlist as seen. */
function Change({ label, change }: { label: string; change: SideChange }) {
  if (change.kind === "first") return null;
  const where = (q: { value: number; city: string }) => `${q.value.toLocaleString()} · ${q.city}`;
  return (
    <span className="watch-change" data-change={change.kind}>
      <span className="muted">{label}</span>{" "}
      {change.kind === "no-data" ? (
        <>No order now{change.was ? ` (was ${where(change.was)})` : ""}</>
      ) : change.kind === "new" ? (
        <>New order, {where(change.now)}</>
      ) : change.kind === "same" ? (
        <>Unchanged</>
      ) : (
        <>
          {change.kind === "up" ? (
            <TrendingUp size={14} aria-hidden="true" />
          ) : (
            <TrendingDown size={14} aria-hidden="true" />
          )}
          <strong>
            {change.kind === "up" ? "Up" : "Down"} {Math.abs(change.percent).toFixed(1)}%
          </strong>{" "}
          (was {where(change.was)})
        </>
      )}
    </span>
  );
}
export function MarketWatchlist({
  region,
  itemId,
  quality,
}: {
  region: string;
  itemId: string;
  quality: number;
}) {
  const [items, setItems] = useState<z.infer<typeof watchResponse> | null>(null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const { quotes, busy: refreshing, refresh } = useBatchQuotes(region);
  const regionalItems = items?.filter((i) => i.region === region) || [];
  // Last seen prices live on this device only (see src/lib/watch-seen.ts).
  const [seen, setSeen] = useState<SeenMap>({});
  useEffect(() => queueMicrotask(() => setSeen(readSeen())), []);
  const current = new Map<string, SeenEntry>();
  for (const i of regionalItems) {
    const q = quotes[quoteKey(i)];
    if (q && !q.error) current.set(seenKey(i), seenSnapshot(q.prices, new Date().toISOString()));
  }
  const lastSeen = regionalItems
    .map((i) => seen[seenKey(i)]?.seenAt)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);
  function markSeen() {
    const next = { ...seen, ...Object.fromEntries(current) };
    setSeen(next);
    setMessage(
      writeSeen(next)
        ? "Marked as seen on this device. Changes count from these prices next time."
        : "This browser could not save what you have seen.",
    );
  }
  async function action(method: "GET" | "POST" | "DELETE", id?: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/market-watch${id ? `/${encodeURIComponent(id)}` : ""}`, {
        method,
        ...(method === "POST"
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ region, itemId: itemId.trim().toUpperCase(), quality }),
            }
          : {}),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Watchlist unavailable. Retry when the service is ready.");
      if (method === "GET") setItems(watchResponse.parse(body));
      else {
        const refreshed = await fetch("/api/market-watch");
        if (!refreshed.ok)
          throw new Error("Change saved. Reload your watchlist to see the latest items.");
        setItems(watchResponse.parse(await refreshed.json()));
        setMessage(method === "POST" ? "Item saved with its region and quality." : "Item removed.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Watchlist unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="market-watchlist">
      <div className="mx-list-head">
        <h3>Your market watchlist</h3>
        <p className="muted">
          Private saved item, region and quality selections. Prices load only when you request
          observations.
        </p>
      </div>
      <div className="actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => action("POST")}
        >
          Save selected item
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => action("GET")}
        >
          Load your watchlist
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy || refreshing || !regionalItems.length}
          onClick={() => void refresh(regionalItems)}
        >
          {refreshing ? "Refreshing watchlist…" : "Refresh watchlist quotes"}
        </button>
      </div>
      {items && regionalItems.length > 0 && (
        <div className="watch-seen">
          <p>
            <strong>Since your last visit</strong>{" "}
            <span className="muted">
              {lastSeen
                ? `· marked as seen ${sourceAge(lastSeen).label}, on this device`
                : "· refresh quotes, then mark them as seen to track changes on this device"}
            </span>
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={!current.size}
            onClick={markSeen}
          >
            <Eye size={15} aria-hidden="true" />
            Mark as seen
          </button>
        </div>
      )}
      {items && (
        <p className="muted">
          Refresh quotes for {regionalItems.length} saved selections in {region}. Other regions stay
          saved and are never mixed into these observations.
        </p>
      )}
      {message && (
        <p role="status">
          {message}{" "}
          {message.toLowerCase().includes("sign in") && (
            <Link className="text-link" href={`/signin?region=${region}`}>
              Sign in with Discord
            </Link>
          )}
        </p>
      )}
      {items?.length === 0 && <p className="mx-list-empty">No saved items yet.</p>}
      <ul className="watchlist-items">
        {items?.map((i) => (
          <li key={i.id}>
            <ItemIcon id={i.itemId} quality={i.quality} size={32} />
            <div className="research-item-details">
              <Link
                className="text-link"
                href={`/tools/market?${new URLSearchParams({ region: i.region, item: i.itemId, quality: String(i.quality) })}`}
              >
                {equipmentName(i.itemId)} · {i.region} · quality {i.quality}
              </Link>
              {i.region === region && <BatchQuote quote={quotes[quoteKey(i)]} />}
              {current.has(seenKey(i)) && (
                <span className="watch-changes">
                  {seen[seenKey(i)] ? (
                    <>
                      <Change
                        label="Sell order"
                        change={sideChange(seen[seenKey(i)], current.get(seenKey(i))!, "sell")}
                      />
                      <Change
                        label="Buy order"
                        change={sideChange(seen[seenKey(i)], current.get(seenKey(i))!, "buy")}
                      />
                    </>
                  ) : (
                    <span className="watch-change muted">
                      New on your watchlist since your last visit
                    </span>
                  )}
                </span>
              )}
            </div>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              aria-label={`Remove ${i.itemId} from watchlist`}
              onClick={() => action("DELETE", i.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
