"use client";
import { AnimatedNumber } from "@/components/animated-number";
import { resizeCraftQuote, type LandingCraftQuote } from "@/lib/landing-craft-quote";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { ItemIcon } from "@/components/item-icon";
import { useOutpostRegion } from "@/components/region-context";
import { Silver } from "./silver";
import { useLoad } from "./use-load";

/**
 * The most worthwhile craft right now, as `/api/landing/craft` picks it: materials with unit and
 * total, cost against sale price, profit and margin, then the same recipe in every city with a
 * complete price set. The stepper recalculates from the same loaded observations. A loss shows as a loss.
 */
export function CraftCard() {
  const region = useOutpostRegion();
  const [batches, setBatches] = useState(1);
  const data = useLoad(region, async (signal) => {
    const r = await fetch(`/api/landing/craft?${new URLSearchParams({ region, batches: "1" })}`, {
      signal,
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || "Market observations unavailable.");
    return body as LandingCraftQuote;
  });
  const quote = data?.value ? resizeCraftQuote(data.value, batches) : undefined;
  const p = quote?.best;
  const cost = p?.upfront != null && p.fees != null ? p.upfront + p.fees : null;
  const tone = p?.profit != null ? (p.profit >= 0 ? "is-gain" : "is-loss") : "";
  const name = (n: string) => n.replace(/^T\d /, "");
  const max = Math.max(...(quote?.byCity.map((c) => Math.abs(c.margin)) ?? [1]), 1);
  return (
    <div className="tool-card" aria-busy={data?.updating ?? false}>
      <div className="tool-item is-recipe">
        {p ? <ItemIcon id={p.recipe.output} size={52} /> : <span className="tool-well" />}
        <span>
          <strong>
            {p ? name(p.recipe.name) : data?.error ? "Unavailable" : "Finding the best recipe…"}
          </strong>
          <small>
            {p
              ? `${p.city} · best of ${quote!.candidates}${
                  quote!.assumptions?.returnRate
                    ? ` · ${quote!.assumptions.returnRate}% return`
                    : ""
                }`
              : data?.error
                ? "No complete price set right now"
                : "Pricing every candidate in every city"}
          </small>
        </span>
        <span className="tool-stepper" role="group" aria-label="Batches">
          <button
            type="button"
            aria-label="Fewer batches"
            disabled={batches <= 1}
            onClick={() => setBatches((b) => b - 1)}
          >
            <Minus size={14} />
          </button>
          <output aria-live="polite">
            <AnimatedNumber value={batches} />
          </output>
          <button
            type="button"
            aria-label="More batches"
            disabled={batches >= 50}
            onClick={() => setBatches((b) => b + 1)}
          >
            <Plus size={14} />
          </button>
        </span>
      </div>
      <div
        className="tool-table-scroll"
        role="region"
        aria-label="Crafting material prices"
        tabIndex={0}
      >
        <table className="tool-table is-materials">
          <thead>
            <tr>
              <th scope="col">Required materials</th>
              <th scope="col">Qty</th>
              <th scope="col">Price (ea)</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {(p?.rows ?? []).map((r) => (
              <tr key={r.id}>
                <th scope="row">
                  <span className="tool-table-item">
                    <ItemIcon id={r.id} size={26} />
                    <span>{name(r.name)}</span>
                  </span>
                </th>
                <td>
                  <AnimatedNumber value={r.quantity} />
                </td>
                <td>
                  <Silver value={r.unit} />
                </td>
                <td>
                  <Silver value={r.gross} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tool-pair">
        <div>
          <span>Total crafting cost</span>
          <b>
            <Silver value={cost} />
          </b>
        </div>
        <div>
          <span>
            Sells for (<AnimatedNumber value={p?.outputQuantity ?? 1} />)
          </span>
          <b>
            <Silver value={p?.revenue} />
          </b>
        </div>
      </div>
      <div className={`tool-profit ${tone}`}>
        <span>
          <small>Profit</small>
          <b>
            {p?.profit != null ? (
              <>
                {p.profit >= 0 ? "+" : "−"}
                <Silver value={Math.abs(p.profit)} />
              </>
            ) : (
              "—"
            )}
          </b>
        </span>
        <span className="tool-profit-margin">
          <small>Margin</small>
          <b>
            {p?.margin != null ? (
              <AnimatedNumber value={p.margin} digits={1} signed suffix="%" />
            ) : (
              "—"
            )}
          </b>
        </span>
      </div>
      <div className="tool-cities">
        <span className="tool-cities-head">Profit by city</span>
        <ol>
          {(quote?.byCity ?? []).slice(0, 4).map((c, i) => (
            <li key={c.city} className={c.profit >= 0 ? "is-gain" : "is-loss"}>
              <span>
                <span className="city-dot" data-city={c.city} />
                {c.city}
                {i === 0 && c.profit >= 0 && <em>Best</em>}
              </span>
              <i>
                <b style={{ width: `${(Math.abs(c.margin) / max) * 100}%` }} />
              </i>
              <span className="tool-cities-value">
                {c.profit >= 0 ? "+" : "−"}
                <Silver value={Math.abs(c.profit)} />
              </span>
            </li>
          ))}
          {!quote?.byCity.length && (
            <li className="tool-muted">
              {p && !p.complete
                ? `No city has every price for this recipe; missing ${p.missing.length}.`
                : data
                  ? "No complete city yet"
                  : "Loading…"}
            </li>
          )}
        </ol>
        {quote && quote.byCity.length > 0 && (quote.unpriced?.length ?? 0) > 0 && (
          <p className="tool-cities-coverage">
            {quote.byCity.length} {quote.byCity.length === 1 ? "city" : "cities"} priced · other
            cities unavailable
          </p>
        )}
      </div>
    </div>
  );
}
