"use client";
import { useState } from "react";
import Link from "@/components/link";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import type { QuoteSelection } from "@/lib/albion/market-quotes";
import { ItemIcon } from "./item-icon";
import { BatchQuote, quoteKey, useBatchQuotes } from "./market-batch-quotes";
export function MarketResearch({
  region,
  itemId,
  quality,
}: {
  region: string;
  itemId: string;
  quality: number;
}) {
  const [items, setItems] = useState<QuoteSelection[]>([]);
  const [message, setMessage] = useState("");
  const { quotes, busy, refresh } = useBatchQuotes(region);
  function add() {
    const selected = { itemId: itemId.trim().toUpperCase(), quality };
    if (!/^[A-Z0-9_@]{3,100}$/.test(selected.itemId)) {
      setMessage("Select a valid Albion item first.");
      return;
    }
    if (items.some((i) => quoteKey(i) === quoteKey(selected))) {
      setMessage("This item and quality are already in your research list.");
      return;
    }
    if (items.length >= 12) {
      setMessage("Research up to 12 selections. Remove one to add another.");
      return;
    }
    setItems([...items, selected]);
    setMessage("Added to research. Refresh to compare observations.");
  }
  return (
    <details className="market-watchlist market-research-list">
      <summary>Research multiple items{items.length ? ` (${items.length}/12)` : ""}</summary>
      <p className="muted">
        Build a temporary shortlist, then refresh city quotes together. Quality stays with each
        item. Quotes always use your selected region: {region}.
      </p>
      <div className="actions">
        <button type="button" className="button secondary" onClick={add}>
          Add selected to research
        </button>
        <button
          type="button"
          className="button"
          disabled={!items.length || busy}
          onClick={() => void refresh(items)}
        >
          {busy ? "Refreshing research…" : "Refresh research quotes"}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {!items.length && (
        <p>Choose an item above and add it here. Compare up to 12 item and quality selections.</p>
      )}
      <ul className="watchlist-items research-items">
        {items.map((i) => (
          <li key={quoteKey(i)}>
            <ItemIcon id={i.itemId} quality={i.quality} size={40} />
            <div className="research-item-details">
              <Link
                className="text-link"
                target="_blank"
                rel="noopener"
                title="Open city prices in a new tab; keep this research list"
                href={`/tools/market?${new URLSearchParams({ region, item: i.itemId, quality: String(i.quality) })}`}
              >
                {equipmentName(i.itemId)} · quality {i.quality}
              </Link>
              <BatchQuote quote={quotes[quoteKey(i)]} />
            </div>
            <button
              type="button"
              className="button secondary"
              aria-label={`Remove ${i.itemId} quality ${i.quality} from research`}
              onClick={() => setItems(items.filter((row) => quoteKey(row) !== quoteKey(i)))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {items.length > 0 && (
        <p className="muted">
          AODP observations, not executable offers. The best buy and sell quotes may belong to
          different cities. Open an item in a new tab for full city comparison while keeping this
          list. This shortlist is not saved; use your watchlist to keep selections.
        </p>
      )}
    </details>
  );
}
