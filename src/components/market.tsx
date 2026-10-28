"use client";
import { Search, MapPin, ChartNoAxesCombined, ArrowRight } from "lucide-react";
import { History } from "./history";
import Link from "@/components/link";
import { CatalogItemPicker } from "./catalog-item-picker";
import { ItemIcon } from "./item-icon";
import { MarketResearch } from "./market-research";
import { MarketWatchlist } from "./market-watchlist";
import { equipmentName, equipmentSlots } from "@/lib/albion/equipment-catalog";
import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import type { MarketPrice } from "@/lib/albion/market-client";
import { isStale, sourceTimestamp } from "@/lib/albion/freshness";
import { summarizeQuotes } from "@/lib/albion/quote-summary";
import { useAtlasRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
export function Market() {
  const params = useSearchParams();
  const region = useAtlasRegion();
  const [item, setItem] = useState(params.get("item") || "T4_BAG");
  const [selectedName, setSelectedName] = useState("");
  const [category, setCategory] = useState("");
  const [tier, setTier] = useState("");
  const [enchantment, setEnchantment] = useState("");
  const [quality, setQuality] = useState(params.get("quality") || "1");
  const [result, setResult] = useState<{ key: string; region: string; rows: MarketPrice[] } | null>(
    null,
  );
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [researchOpen, setResearchOpen] = useState<boolean | null>(null);
  const [selectedCity, setSelectedCity] = useState("");
  const [extraCities, setExtraCities] = useState<string[]>([]);
  const [sort, setSort] = useState("city");
  const controller = useRef<AbortController | null>(null);
  const current = `${region}:${item.trim().toUpperCase()}:${quality}`;
  useEffect(() => () => controller.current?.abort(), [current]);
  const loading = pendingKey === current;
  const hasResult = result?.key === current;
  const hasError = error?.key === current;
  const rows = result?.key === current ? result.rows : [];
  const summary = summarizeQuotes(rows);
  const visible = rows
    .filter(
      (r) => (!city || r.city === city) && (!extraCities.length || extraCities.includes(r.city)),
    )
    .toSorted((a, b) =>
      sort === "sell"
        ? (a.sell_price_min || Infinity) - (b.sell_price_min || Infinity)
        : sort === "buy"
          ? b.buy_price_max - a.buy_price_max
          : a.city.localeCompare(b.city),
    );
  const selectedQuote = visible.find((row) => row.city === selectedCity);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const key = current;
    setPendingKey(current);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(
        `/api/market?${new URLSearchParams({ region, item: item.trim().toUpperCase(), quality })}`,
        { signal: active.signal },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.region !== region) throw new Error("Source region mismatch");
      if (!active.signal.aborted) setResult({ key, region, rows: data.prices });
    } catch (e) {
      if (!active.signal.aborted)
        setError({ key, message: e instanceof Error ? e.message : "Could not load prices" });
    } finally {
      if (controller.current === active) setPendingKey(null);
    }
  }
  const format = (n: number) => (n ? n.toLocaleString() : "No quote");
  const dateLabel = (value: string) => {
    const stamp = sourceTimestamp(value);
    return Number.isFinite(stamp)
      ? new Date(stamp).toISOString().slice(0, 16).replace("T", " ")
      : "Unknown";
  };
  return (
    <div
      className={`market-workspace${hasResult ? " has-results" : " is-setup"}`}
      aria-busy={loading}
    >
      <ol className="task-progress" aria-label="Market workflow">
        <li aria-current={!hasResult ? "step" : undefined}>
          <span>1</span> Choose an item
        </li>
        <li>
          <span>2</span> City & quality
        </li>
        <li aria-current={hasResult ? "step" : undefined}>
          <span>3</span> Compare prices
        </li>
      </ol>
      <section className="market-query-panel" aria-label="Market search and filters">
        <div className="market-setup-heading">
          <h2>Search the markets</h2>
          <p>Search by name, select an item, then compare observed city prices.</p>
        </div>
        <form className="market-form market-filters" onSubmit={submit}>
          <CatalogItemPicker
            category={category}
            tier={tier}
            enchantment={enchantment}
            onSelect={(i) => {
              setItem(i.id);
              setSelectedName(i.name);
            }}
          />
          <label>
            Quality
            <select
              aria-label="Quality"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
            >
              {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"].map((x, i) => (
                <option value={i + 1} key={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>

          <label>
            Market city
            <select aria-label="Market city" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button className="button primary" disabled={loading}>
            {loading ? "Fetching observations…" : "Compare prices"}
          </button>
        </form>
        <details className="reference-city-filter">
          <summary>
            Compare multiple cities
            {extraCities.length ? ` · ${extraCities.length} selected` : " · All cities"}
          </summary>
          <div className="reference-city-options">
            {cities.map((name) => (
              <label key={name}>
                <input
                  type="checkbox"
                  checked={extraCities.includes(name)}
                  onChange={(e) => {
                    setCity("");
                    setExtraCities(
                      e.target.checked
                        ? [...extraCities, name]
                        : extraCities.filter((c) => c !== name),
                    );
                  }}
                />
                {name}
              </label>
            ))}
          </div>
        </details>
        <details className="market-catalog-filters">
          <summary>Item filters</summary>
          <div className="market-discovery-filters">
            <label>
              Item category
              <select
                aria-label="Item category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {equipmentSlots.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Item tier
              <select
                aria-label="Market item tier"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
              >
                <option value="">All tiers</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Enchantment
              <select
                aria-label="Market enchantment"
                value={enchantment}
                onChange={(e) => setEnchantment(e.target.value)}
              >
                <option value="">All enchantments</option>
                {[0, 1, 2, 3, 4].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
        </details>
        <div className="reference-filter-chips">
          {extraCities.map((name) => (
            <button
              type="button"
              key={name}
              aria-label={`Remove ${name} filter`}
              onClick={() => setExtraCities(extraCities.filter((c) => c !== name))}
            >
              {name} ×
            </button>
          ))}
          {(extraCities.length > 0 ||
            city ||
            tier ||
            category ||
            enchantment ||
            quality !== "1") && (
            <button
              type="button"
              onClick={() => {
                setExtraCities([]);
                setCity("");
                setTier("");
                setCategory("");
                setEnchantment("");
                setQuality("1");
              }}
            >
              Reset filters
            </button>
          )}
        </div>
        {error?.key === current && (
          <p role="alert" className="error">
            {error.message}
          </p>
        )}
        {result && result.key !== current && (
          <p role="status">
            {result.region !== region ? "Region changed." : "Selection changed."} Request new
            observations for the selected item and quality.
          </p>
        )}
      </section>
      <section className="market-board">
        <div className="market-results-heading">
          <h2>{hasResult ? "Market results" : "Your market research"}</h2>
          <span>
            {hasResult ? `${visible.length} city observations` : "Choose an item to compare cities"}
          </span>
        </div>
        {hasResult && (
          <div className="market-observation-legend" aria-label="Market observation context">
            <span>
              <strong>
                {
                  visible.filter((r) => r.sell_price_min > 0 && !isStale(r.sell_price_min_date))
                    .length
                }
              </strong>{" "}
              recent sell observations
            </span>
            <span>Sell orders: seller listings</span>
            <span>Buy orders: buyer offers</span>
            <span>Source times in UTC</span>
          </div>
        )}
        {hasResult && (
          <>
            <div className="market-table-toolbar" aria-label="Observation filters">
              <label>
                Sort market prices
                <select
                  aria-label="Sort market prices"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="city">City name</option>
                  <option value="sell">Lowest sell price</option>
                  <option value="buy">Highest buy price</option>
                </select>
              </label>
            </div>
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Scrollable market observations"
            >
              <table>
                <caption className="market-table-caption">
                  <span>
                    <ItemIcon id={item} quality={Number(quality)} size={28} />
                    <strong>{selectedName || equipmentName(item)}</strong>
                  </span>
                  <span>
                    {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][
                      Number(quality) - 1
                    ] || "Unknown quality"}{" "}
                    · {region} · Observed prices · UTC
                  </span>
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Market</th>
                    <th scope="col" className="numeric" aria-label="Lowest sell order">
                      <span className="market-col-long">Lowest sell order</span>
                      <span className="market-col-short">Sell order</span>
                    </th>
                    <th scope="col" className="numeric" aria-label="Highest buy order">
                      <span className="market-col-long">Highest buy order</span>
                      <span className="market-col-short">Buy order</span>
                    </th>
                    <th scope="col">Sell observation (UTC)</th>
                    <th scope="col">Buy observation (UTC)</th>
                  </tr>
                </thead>
                <tbody
                  key={result?.key || "empty"}
                  className={rows.length ? "price-refresh" : undefined}
                >
                  {visible.map((r, i) => (
                    <tr
                      key={`${r.city}-${i}`}
                      className={selectedQuote === r ? "selected-market-row" : undefined}
                    >
                      <td>
                        <span className="market-table-item">
                          <ItemIcon id={r.item_id} quality={r.quality} size={36} />
                          <span>{equipmentName(r.item_id)}</span>
                        </span>
                      </td>
                      <td>
                        <span className="city-indicator" aria-hidden="true">
                          {r.city.slice(0, 2).toUpperCase()}
                        </span>
                        <button
                          type="button"
                          className="market-row-select"
                          aria-pressed={selectedQuote === r}
                          onClick={() => setSelectedCity(r.city)}
                        >
                          {r.city}
                          <span className="sr-only"> market details</span>
                        </button>
                      </td>
                      <td className="numeric">
                        <span className={!r.sell_price_min ? "market-price-missing" : undefined}>
                          {format(r.sell_price_min)}
                        </span>
                        <small className="market-inline-time" title={r.sell_price_min_date}>
                          {r.sell_price_min
                            ? `${dateLabel(r.sell_price_min_date).replace(/^\d{4}-/, "")}${isStale(r.sell_price_min_date) ? " · STALE" : ""}`
                            : "No observation"}
                        </small>
                      </td>
                      <td className="numeric">
                        <span className={!r.buy_price_max ? "market-price-missing" : undefined}>
                          {format(r.buy_price_max)}
                        </span>
                        <small className="market-inline-time" title={r.buy_price_max_date}>
                          {r.buy_price_max
                            ? `${dateLabel(r.buy_price_max_date).replace(/^\d{4}-/, "")}${isStale(r.buy_price_max_date) ? " · STALE" : ""}`
                            : "No observation"}
                        </small>
                      </td>
                      <td className="observation-time" title={r.sell_price_min_date}>
                        {r.sell_price_min
                          ? `${dateLabel(r.sell_price_min_date)} ${isStale(r.sell_price_min_date) ? "· STALE" : ""}`
                          : "—"}
                      </td>
                      <td className="observation-time" title={r.buy_price_max_date}>
                        {r.buy_price_max
                          ? `${dateLabel(r.buy_price_max_date)} ${isStale(r.buy_price_max_date) ? "· STALE" : ""}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && (
              <div className="empty market-empty" role="status">
                {loading
                  ? "Loading source observations…"
                  : error?.key === current
                    ? "No observations loaded. Compare prices to retry."
                    : result?.key === current
                      ? "No observations available for this selection."
                      : "Choose an item and compare markets to begin."}
              </div>
            )}
          </>
        )}
        {!hasResult && (
          <div className="market-first-use" role="status">
            <div className="market-selection">
              <ItemIcon id={item} quality={Number(quality)} size={56} />
              <div>
                <strong>{selectedName || equipmentName(item)}</strong>
                <span>
                  Selected item ·{" "}
                  {
                    ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][
                      Number(quality) - 1
                    ]
                  }{" "}
                  quality
                </span>
              </div>
            </div>
            <div className="market-start-examples" aria-label="Suggested market items">
              {[
                { id: "T4_BAG", name: "Bag" },
                { id: "T4_MAIN_AXE", name: "Battleaxe" },
                { id: "T4_CAPE", name: "Cape" },
              ].map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  aria-pressed={item === preset.id}
                  onClick={() => {
                    setItem(preset.id);
                    setSelectedName(preset.name);
                  }}
                >
                  <ItemIcon id={preset.id} size={28} />
                  {preset.name}
                </button>
              ))}
            </div>
            <p>
              {loading
                ? "Fetching player observations from Albion Online Data Project…"
                : hasError
                  ? "The price source could not be reached. Your selection is kept. Use Compare prices to retry."
                  : "Choose an item above or try a suggestion. No prices are requested until you compare."}
            </p>
          </div>
        )}
        {hasResult && !summary.available && (
          <div className="task-state" role="status">
            <h3>No usable prices returned</h3>
            <p>
              Albion Online Data Project relies on players scanning markets. This item and quality
              have no valid quotes in this response. No last observation is known.
            </p>
            <p>
              Try Normal quality, another item, or compare again after visiting the market in game.
            </p>
          </div>
        )}
        <small className="muted market-source-note">
          Source: Albion Online Data Project · Observations older than one hour or unexpectedly in
          the future are marked stale. Observations do not guarantee executable trades or liquidity.
        </small>
        <div className="market-secondary-controls">
          <details className="market-advanced">
            <summary>Advanced item identifier</summary>{" "}
            <label>
              Item identifier
              <input
                required
                pattern="[A-Za-z0-9_@]+"
                maxLength={100}
                value={item}
                onChange={(e) => {
                  setItem(e.target.value);
                  setSelectedName("");
                }}
                placeholder="e.g. T4_BAG or T6_MAIN_SWORD@1"
              />
            </label>
          </details>
        </div>
      </section>
      <aside className="market-item-panel">
        {hasResult ? (
          <div className="market-item-overview">
            <div className="market-selected-item">
              <ItemIcon id={item} quality={Number(quality)} size={88} />
              <div>
                <span className="eyebrow">SELECTED ITEM</span>
                <h2>{selectedName || equipmentName(item)}</h2>
                <p>
                  {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][
                    Number(quality) - 1
                  ] || "Unknown quality"}{" "}
                  · {region}
                </p>
              </div>
            </div>
            {selectedQuote && (
              <section className="reference-city-summary" aria-live="polite">
                <h3>{selectedQuote.city}</h3>
                <dl>
                  <div>
                    <dt>Observed sell order</dt>
                    <dd className="numeric">{format(selectedQuote.sell_price_min)}</dd>
                  </div>
                  <div>
                    <dt>Observed buy order</dt>
                    <dd className="numeric">{format(selectedQuote.buy_price_max)}</dd>
                  </div>
                </dl>
                <p>
                  Sell observed:{" "}
                  {selectedQuote.sell_price_min
                    ? dateLabel(selectedQuote.sell_price_min_date) + " UTC"
                    : "No observation"}
                  {selectedQuote.sell_price_min && isStale(selectedQuote.sell_price_min_date)
                    ? " · STALE"
                    : ""}
                </p>
                <p>
                  Buy observed:{" "}
                  {selectedQuote.buy_price_max
                    ? dateLabel(selectedQuote.buy_price_max_date) + " UTC"
                    : "No observation"}
                  {selectedQuote.buy_price_max && isStale(selectedQuote.buy_price_max_date)
                    ? " · STALE"
                    : ""}
                </p>
              </section>
            )}
            <p className="quote-freshness">
              {rows.length
                ? !summary.available
                  ? "No valid price observations were returned for this item."
                  : summary.stale
                    ? "Some observations are stale. Check timestamps before trading."
                    : "Source timestamps are within the application freshness window."
                : "Request prices to inspect quote freshness."}
            </p>
            <dl className="market-quote-summary">
              <div>
                <dt>Lowest observed sell order</dt>
                <dd className={`numeric${summary.ask ? "" : " quote-unavailable"}`}>
                  {summary.ask ? format(summary.ask.sell_price_min) : "No quote"}
                  <small>{summary.ask?.city || "No available quote"}</small>
                </dd>
              </div>
              <div>
                <dt>Highest observed buy order</dt>
                <dd className={`numeric${summary.bid ? "" : " quote-unavailable"}`}>
                  {summary.bid ? format(summary.bid.buy_price_max) : "No quote"}
                  <small>{summary.bid?.city || "No available quote"}</small>
                </dd>
              </div>
            </dl>
            <div className="actions">
              <Link className="button secondary" href={`/tools/flipping?region=${region}`}>
                Plan a trade
              </Link>
              <Link className="text-link" href={`/items?region=${region}`}>
                Item reference
              </Link>
            </div>
          </div>
        ) : (
          <div className="market-getting-started">
            <ChartNoAxesCombined size={32} aria-hidden="true" />
            <h2>From a price check to a trade</h2>
            <ul>
              <li>
                <Search aria-hidden="true" />
                <div>
                  <strong>Find your item</strong>
                  <p>
                    Search gear, resources or consumables. Use item filters for tier and
                    enchantment.
                  </p>
                </div>
              </li>
              <li>
                <MapPin aria-hidden="true" />
                <div>
                  <strong>Compare the right markets</strong>
                  <p>Choose quality, then filter the returned prices by city.</p>
                </div>
              </li>
              <li>
                <ArrowRight aria-hidden="true" />
                <div>
                  <strong>Check before you commit</strong>
                  <p>
                    Inspect source times and price history. Plan fees and transport before trading.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        )}
        <div id="market-saved-research">
          <MarketResearch region={region} itemId={item} quality={Number(quality)} />
          <MarketWatchlist region={region} itemId={item} quality={Number(quality)} />
        </div>
      </aside>
      <section className="reference-market-history" id="market-history-research">
        <div className="section-heading">
          <h2>Price history</h2>
          <button
            type="button"
            className="button secondary"
            aria-expanded={researchOpen ?? hasResult}
            onClick={() => setResearchOpen(!(researchOpen ?? hasResult))}
          >
            {(researchOpen ?? hasResult) ? "Hide price history" : "Research price history"}
          </button>
        </div>
        {(researchOpen ?? hasResult) ? (
          <History item={item} quality={Number(quality)} />
        ) : (
          <p className="muted">
            Compare current prices or open history to research daily observations. Gaps remain gaps;
            prices are in silver.
          </p>
        )}
      </section>
    </div>
  );
}
