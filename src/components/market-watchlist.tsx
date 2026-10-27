"use client";
import { useState } from "react";
import Link from "next/link";
import { watchResponse } from "@/lib/market-watch";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { ItemIcon } from "./item-icon";
import { BatchQuote, quoteKey, useBatchQuotes } from "./market-batch-quotes";
import type { z } from "zod";
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
    <details className="market-watchlist">
      <summary>Your market watchlist</summary>
      <p className="muted">
        Private saved item, region and quality selections. Prices load only when you request
        observations.
      </p>
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
      {items?.length === 0 && <p>No saved items yet.</p>}
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
    </details>
  );
}
