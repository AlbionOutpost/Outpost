"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "@/components/link";
import { useOutpostRegion } from "./region-context";
import { gearCategories } from "@/lib/albion/craft-categories";
import { blackMarketBoard, type BoardItem, type BoardQuote } from "@/lib/albion/black-market";
import type { MarketPrice } from "@/lib/albion/market-quotes";
import { ItemIcon } from "./item-icon";
import { PanelHead } from "./panel-head";
import { Disclosure } from "./disclosure";
import { EmptyWell } from "./empty-well";
import { RetryLine } from "./calculator-shell";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
import { TaxField } from "./tax-field";
import { Observed, coin, PRICE_ERROR } from "./calculator-figures";
import s from "./calculator-shell.module.css";
import c from "@/app/calculators.module.css";
import m from "./market-scans.module.css";

const qualities = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];
const groups = [...new Set(gearCategories.map((g) => g.group))];
type Data = { items: BoardItem[]; prices: MarketPrice[]; total: number; quality: number };

/** A price with its city and its own observation time. */
function Quote({ quote, label }: { quote: BoardQuote | null; label: string }) {
  return (
    <span className={c.flipPrice}>
      <span className={c.flipLabel}>{label}</span>
      {quote ? (
        <>
          {coin(quote.value)}
          <small>
            {quote.city === "Black Market" ? null : <>{quote.city} · </>}
            <Observed at={quote.observedAt} />
          </small>
        </>
      ) : (
        <Unavailable />
      )}
    </span>
  );
}

/**
 * Black Market board: every item of a gear category over a tier range, the cheapest player-city
 * sell order beside the Black Market's buy order for the same item, enchantment and quality, and
 * what is left after the player's tax. One bounded price request per selection; tax is applied
 * here, so changing it never requests prices again.
 */
export function BlackMarketBoard() {
  const region = useOutpostRegion(),
    [category, setCategory] = useState<string>("sword"),
    [fromTier, setFromTier] = useState(4),
    [toTier, setToTier] = useState(8),
    [enchantment, setEnchantment] = useState(0),
    [quality, setQuality] = useState(1),
    [tax, setTax] = useState<number | null>(4),
    [result, setResult] = useState<{ key: string; data: Data } | null>(null),
    [error, setError] = useState<string | null>(null),
    [pendingKey, setPendingKey] = useState<string | null>(null);
  const query = new URLSearchParams({
    region,
    category,
    fromTier: String(fromTier),
    toTier: String(toTier),
    enchantment: String(enchantment),
    quality: String(quality),
  }).toString();
  const busy = pendingKey === query;
  const data = result?.key === query ? result.data : null;
  const controller = useRef<AbortController | null>(null);
  async function load() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const key = query;
    setPendingKey(key);
    setError(null);
    try {
      const r = await fetch(`/api/economy/black-market?${key}`, { signal: active.signal });
      if (!r.ok) throw new Error("Board request failed");
      const body = (await r.json()) as Data;
      if (!active.signal.aborted) setResult({ key, data: body });
    } catch {
      if (!active.signal.aborted) setError(key);
    } finally {
      if (controller.current === active) setPendingKey(null);
    }
  }
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => void loadRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => () => controller.current?.abort(), []);
  const taxValid = tax !== null && tax >= 0 && tax <= 100;
  const rows = data && taxValid ? blackMarketBoard(data.items, data.prices, quality, tax) : [];
  const paying = rows.filter((r) => r.complete && r.net! > 0).length;
  const priced = rows.filter((r) => r.complete).length;
  const tierRange = fromTier === toTier ? `T${fromTier}` : `T${fromTier}–T${toTier}`;
  const tierOptions = [4, 5, 6, 7, 8];
  return (
    <section className={`panel ${c.scanner}`} aria-labelledby="bm-board-heading">
      <PanelHead
        id="bm-board-heading"
        title="Compare the Black Market"
        line="The cheapest city sell order for each item beside the Black Market's buy order, after your tax."
        actions={
          <button
            type="button"
            className={`button secondary ${s.refresh}`}
            aria-busy={busy}
            disabled={busy}
            onClick={() => void load()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {busy ? "Loading…" : "Refresh prices"}
          </button>
        }
      />
      <div className={c.scanSetup}>
        <div className={`${s.fields} ${c.routeFields}`}>
          <label className={m.wide}>
            Category
            <WellSelect value={category} onChange={(e) => setCategory(e.target.value)}>
              {groups.map((group) => (
                <optgroup key={group} label={group}>
                  {gearCategories
                    .filter((g) => g.group === group)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </WellSelect>
          </label>
          <label>
            From tier
            <WellSelect
              value={fromTier}
              onChange={(e) => {
                const t = Number(e.target.value);
                setFromTier(t);
                if (t > toTier) setToTier(t);
              }}
            >
              {tierOptions.map((t) => (
                <option key={t} value={t}>
                  T{t}
                </option>
              ))}
            </WellSelect>
          </label>
          <label>
            To tier
            <WellSelect
              value={toTier}
              onChange={(e) => {
                const t = Number(e.target.value);
                setToTier(t);
                if (t < fromTier) setFromTier(t);
              }}
            >
              {tierOptions.map((t) => (
                <option key={t} value={t}>
                  T{t}
                </option>
              ))}
            </WellSelect>
          </label>
          <label>
            Enchantment
            <WellSelect
              value={enchantment}
              onChange={(e) => setEnchantment(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  .{n}
                </option>
              ))}
            </WellSelect>
          </label>
          <label>
            Quality
            <WellSelect value={quality} onChange={(e) => setQuality(Number(e.target.value))}>
              {qualities.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </WellSelect>
          </label>
        </div>
        <div className={c.scanItems}>
          <TaxField value={tax} onChange={setTax} />
        </div>
      </div>
      {error === query ? (
        <RetryLine onRetry={() => void load()}>{PRICE_ERROR}</RetryLine>
      ) : !taxValid ? (
        <StatusLine tone="error">Enter a tax from 0 to 100%.</StatusLine>
      ) : !data ? (
        <StatusLine>Loading Black Market and city orders…</StatusLine>
      ) : !data.items.length ? null : (
        <StatusLine>
          {paying} of {rows.length} {rows.length === 1 ? "item pays" : "items pay"} more at the
          Black Market after {tax}% tax, best first
          {priced < rows.length
            ? `; ${rows.length - priced} without both orders are listed last`
            : ""}
          .
          {data.total > data.items.length
            ? ` Showing the first ${data.items.length} of ${data.total}; narrow the tiers to see the rest.`
            : ""}
        </StatusLine>
      )}
      {data && !data.items.length ? (
        <EmptyWell
          emblem="silver"
          title="No gear in this range"
          line={`No ${tierRange}.${enchantment} items are recorded for this category. Try another tier or enchantment.`}
        />
      ) : (
        <div className={c.flips} role="region" aria-label="Black Market board">
          <div className={c.flipHead} aria-hidden="true">
            <span>Item</span>
            <span>Buy · cheapest city</span>
            <span>Black Market buys at</span>
            <span>Net</span>
            <span>Margin</span>
            <span />
          </div>
          <ul>
            {rows.map((r) => (
              <li
                key={r.id}
                className={c.flip}
                data-outcome={!r.complete ? "incomplete" : r.net! > 0 ? "positive" : "negative"}
              >
                <ItemIcon id={r.id} quality={quality} size={40} />
                <span className={c.flipName}>
                  <Link
                    className="text-link"
                    href={`/tools/market?${new URLSearchParams({ region, item: r.id, quality: String(quality) })}`}
                    title="Every city's orders in Market Explorer"
                  >
                    <strong>{r.name}</strong>
                  </Link>
                  <small>
                    {!r.buy && !r.blackMarket
                      ? "No orders observed"
                      : !r.blackMarket
                        ? "No Black Market buy order"
                        : !r.buy
                          ? "No city sell order"
                          : r.stale
                            ? "Includes old prices"
                            : `Recent prices · ${r.cities} ${r.cities === 1 ? "city" : "cities"}`}
                  </small>
                </span>
                <Quote quote={r.buy} label="Buy · cheapest city" />
                <Quote quote={r.blackMarket} label="Black Market buys at" />
                <span className={c.flipNet}>
                  <span className="sr-only">Net: </span>
                  {r.net != null ? (
                    coin(r.net)
                  ) : (
                    // A lone dash in the narrow net column; the word stays for assistive tech.
                    <span className={c.flipNa}>
                      —<span className="sr-only"> Unavailable</span>
                    </span>
                  )}
                </span>
                <span className={c.flipMargin}>
                  <span className="sr-only">Margin: </span>
                  {r.margin == null ? "" : `${r.margin.toFixed(1)}%`}
                </span>
                {r.buy ? (
                  <Link
                    className={`pill-link ${c.flipAction}`}
                    aria-label={`Plan haul for ${r.name}`}
                    href={`/tools/transporting?${new URLSearchParams({ region, item: r.id, from: r.buy.city, to: "Black Market", quality: String(quality) })}`}
                  >
                    Plan haul <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                ) : (
                  <span className={`pill-link ${c.flipAction}`} aria-disabled="true">
                    Plan haul <ArrowRight size={14} aria-hidden="true" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={s.stack}>
        <Disclosure summary="How the board works">
          <div className={c.prose}>
            <p>
              Net is the Black Market&apos;s highest buy order after {taxValid ? tax : "your"}% tax,
              minus the lowest sell order in any player city (Black Market listings are not a place
              to buy), for one {qualities[quality - 1].toLowerCase()} item. Only orders for the
              exact item, enchantment and quality count; a missing order is shown as missing, never
              as zero.
            </p>
            <p>
              Prices come from the Albion Online Data Project as players upload them, each with its
              own age; past an hour it is marked stale. The Black Market&apos;s orders fill and move
              fast, and how many it wants, the haul to Caerleon and its danger aren&apos;t counted.
              Check in game before you buy.
            </p>
          </div>
        </Disclosure>
      </div>
    </section>
  );
}
