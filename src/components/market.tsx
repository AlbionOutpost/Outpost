"use client";
import { ArrowRight, Database, SlidersHorizontal } from "lucide-react";
import "./market-explorer.css";
import { History } from "./history";
import Link from "@/components/link";
import { CatalogItemPicker } from "./catalog-item-picker";
import { ItemIcon } from "./item-icon";
import { MarketResearch } from "./market-research";
import { MarketWatchlist } from "./market-watchlist";
import { MarketQualityAvailability } from "./market-quality-availability";
import { equipmentName, equipmentSlots } from "@/lib/albion/equipment-catalog";
import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useId, useSyncExternalStore } from "react";
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
  const [category, setCategory] = useState(
    equipmentSlots.find((slot) => slot === params.get("category")) || "",
  );
  const [tier, setTier] = useState(
    /^[1-8]$/.test(params.get("tier") || "") ? params.get("tier")! : "",
  );
  const [enchantment, setEnchantment] = useState(
    /^[0-4]$/.test(params.get("enchantment") || "") ? params.get("enchantment")! : "",
  );
  const [quality, setQuality] = useState(params.get("quality") || "1");
  const [result, setResult] = useState<{ key: string; region: string; rows: MarketPrice[] } | null>(
    null,
  );
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [city, setCity] = useState(() => cities.find((name) => name === params.get("city")) || "");
  const [researchOpen, setResearchOpen] = useState<boolean | null>(null);
  const [selectedCity, setSelectedCity] = useState("");
  const [extraCities, setExtraCities] = useState<string[]>(() => [
    ...new Set(
      (params.get("cities") || "")
        .split(",")
        .filter((city) => cities.includes(city as (typeof cities)[number])),
    ),
  ]);
  const [sort, setSort] = useState("city");
  const [savedTab, setSavedTab] = useState<"research" | "watchlist">("research");
  const tabId = useId();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const controller = useRef<AbortController | null>(null);
  const qualityControl = useRef<HTMLSelectElement | null>(null);
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
  const selectedItemName = selectedName || equipmentName(item);
  const qualityName =
    ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][Number(quality) - 1] ||
    "Unknown quality";
  const validSelection = /^[A-Z0-9_@]{3,100}$/.test(item.trim().toUpperCase());
  const marketLabel =
    city || (extraCities.length ? `${extraCities.length} cities selected` : "All cities");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await load();
  }
  const loadRef = useRef(load);
  loadRef.current = load;
  // Research-first: a valid selection loads its prices as soon as it changes, so arriving
  // with ?item= or picking from the catalog shows city prices without a second click.
  useEffect(() => {
    if (!hydrated || !validSelection) return;
    const timer = window.setTimeout(() => void loadRef.current(), 150);
    return () => window.clearTimeout(timer);
  }, [current, hydrated, validSelection]);
  async function load() {
    const url = new URL(window.location.href);
    const selection = {
      region,
      item: item.trim().toUpperCase(),
      quality,
      city,
      category,
      tier,
      enchantment,
      cities: extraCities.join(","),
    };
    for (const [key, value] of Object.entries(selection)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", url);
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
  const format = (n: number) => (n ? n.toLocaleString() : "Not observed");
  const dateLabel = (value: string) => {
    const stamp = sourceTimestamp(value);
    return Number.isFinite(stamp)
      ? new Date(stamp).toISOString().slice(0, 16).replace("T", " ")
      : "Unknown";
  };
  return (
    <div
      className={`market-workspace market-focused market-rebuild${hasResult ? " has-results" : " is-setup"}${selectedQuote ? " has-city-detail" : ""}`}
      aria-busy={loading}
    >
      <section className="market-query-panel" aria-label="Market search and filters">
        <fieldset className="market-hydration-guard" disabled={!hydrated}>
          <form
            id="market-compare-query"
            className="market-form market-filters"
            method="post"
            onSubmit={submit}
          >
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
                ref={qualityControl}
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
              <select
                aria-label="Market city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <button className="button primary" disabled={!hydrated || loading || !validSelection}>
              {loading ? "Fetching observations…" : "Refresh prices"}
            </button>
          </form>
          <div className="market-selection-row">
            <div className="market-selection" aria-label="Selected market item">
              <ItemIcon id={item} quality={Number(quality)} size={40} />
              <div>
                <strong>{selectedItemName}</strong>
                <span>
                  {qualityName} · {region} · {marketLabel}
                </span>
              </div>
            </div>
            <div className="market-start-examples" aria-label="Suggested market items">
              <span>Quick picks</span>
              {[
                { id: "T4_BAG", name: "Bag" },
                { id: "T4_MAIN_AXE", name: "Battleaxe" },
                { id: "T4_CAPE", name: "Cape" },
              ]
                .filter((preset) => preset.id !== item)
                .map((preset) => (
                  <button
                    type="button"
                    key={preset.id}
                    aria-pressed={item === preset.id}
                    onClick={() => {
                      setItem(preset.id);
                      setSelectedName(preset.name);
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
            </div>
          </div>
          <div className="market-filter-disclosures">
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
            <details className="market-advanced">
              <summary>Advanced item identifier</summary>
              <label>
                Item identifier
                <input
                  form="market-compare-query"
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
        </fieldset>
      </section>
      <section className="market-board">
        <div className="market-results-heading">
          <h2>{hasResult ? "Market results" : "Compare city orders"}</h2>
          <span>
            {hasResult
              ? `${visible.length} city observations`
              : loading
                ? "Requesting observations"
                : hasError
                  ? "Request failed · selection kept"
                  : validSelection
                    ? `${marketLabel} · ready to compare`
                    : "Choose an item to continue"}
          </span>
        </div>
        {hasResult && summary.available > 0 && (
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
            <span>Source times in UTC</span>
          </div>
        )}
        {hasResult && summary.available > 0 && (
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
                          {r.city === "Black Market" ? "Not sold here" : format(r.sell_price_min)}
                        </span>
                        <small className="market-inline-time" title={r.sell_price_min_date}>
                          {r.sell_price_min
                            ? `${dateLabel(r.sell_price_min_date).replace(/^\d{4}-/, "")}${isStale(r.sell_price_min_date) ? " · STALE" : ""}`
                            : r.city === "Black Market"
                              ? "Buys items from players"
                              : "No sell observation"}
                        </small>
                      </td>
                      <td className="numeric">
                        <span className={!r.buy_price_max ? "market-price-missing" : undefined}>
                          {format(r.buy_price_max)}
                        </span>
                        <small className="market-inline-time" title={r.buy_price_max_date}>
                          {r.buy_price_max
                            ? `${dateLabel(r.buy_price_max_date).replace(/^\d{4}-/, "")}${isStale(r.buy_price_max_date) ? " · STALE" : ""}`
                            : "No buy observation"}
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
                    ? "No observations loaded. Refresh prices to retry."
                    : result?.key === current
                      ? "No city matches these filters. Reset filters to see the scanned markets."
                      : "Choose an item and compare markets to begin."}
              </div>
            )}
          </>
        )}
        {!hasResult && (
          <div className="market-first-use" role="status">
            <Database size={24} aria-hidden="true" />
            <div>
              <h3>
                {loading
                  ? "Checking the markets…"
                  : hasError
                    ? "Your selection is safe"
                    : validSelection
                      ? "Loading city prices"
                      : "Choose a valid item"}
              </h3>
              <p>
                {loading
                  ? "Fetching player observations from Albion Online Data Project. Each order keeps its own source time."
                  : hasError
                    ? "Refresh prices to retry, or change the selection. No failed or previous observation is shown as a current quote."
                    : validSelection
                      ? "Sell listings and buy offers load for every selection as soon as you make it."
                      : "Search for an item above, choose a quick pick, or enter its item identifier."}
              </p>
            </div>
          </div>
        )}
        {hasResult && !summary.available && (
          <div className="task-state" role="status">
            <h3>No price observations for this selection</h3>
            <p>
              No last observation is known for this selection. Albion Online Data Project collects
              prices when players running its client open markets in game. A missing observation is
              not a zero price or proof that the item is unavailable.
            </p>
            <Link
              className="text-link"
              href={`/market-data?${new URLSearchParams({ region, item, quality, ...(city ? { city } : {}) })}`}
            >
              See how to get market coverage →
            </Link>
          </div>
        )}
        <small className="muted market-source-note">
          Albion Online Data Project · Sell orders are seller listings; buy orders are buyer offers.
          Individual source times are shown with each order. Prices older than one hour are marked
          stale; an observation does not guarantee an available trade.
        </small>
        {hasResult && (
          <MarketQualityAvailability
            region={region}
            item={item}
            city={city || (extraCities.length === 1 ? extraCities[0] : "")}
            quality={quality}
            onChoose={(next) => {
              setQuality(next);
              requestAnimationFrame(() => qualityControl.current?.focus());
            }}
          />
        )}
        {hasResult && summary.available > 0 && (
          <div className="market-best-observations">
            <p>Across all returned cities</p>
            <dl className="market-quote-summary">
              <div>
                <dt>Lowest observed sell order</dt>
                <dd className="numeric">
                  {summary.ask ? format(summary.ask.sell_price_min) : "Not observed"}
                  <small>
                    {summary.ask
                      ? `${summary.ask.city} · ${dateLabel(summary.ask.sell_price_min_date)} UTC${isStale(summary.ask.sell_price_min_date) ? " · STALE" : ""}`
                      : "No sell listing recorded"}
                  </small>
                </dd>
              </div>
              <div>
                <dt>Highest observed buy order</dt>
                <dd className="numeric">
                  {summary.bid ? format(summary.bid.buy_price_max) : "Not observed"}
                  <small>
                    {summary.bid
                      ? `${summary.bid.city} · ${dateLabel(summary.bid.buy_price_max_date)} UTC${isStale(summary.bid.buy_price_max_date) ? " · STALE" : ""}`
                      : "No buy order recorded"}
                  </small>
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>
      {selectedQuote && (
        <aside
          className="market-item-panel market-city-inspector"
          aria-label="Selected city observation"
        >
          <div className="market-inspector-heading">
            <div>
              <span>Selected market</span>
              <h2>{selectedQuote.city}</h2>
            </div>
            <button type="button" className="text-link" onClick={() => setSelectedCity("")}>
              Close details
            </button>
          </div>
          <section className="reference-city-summary" aria-live="polite">
            <dl>
              <div>
                <dt>Observed sell order</dt>
                <dd className="numeric">
                  {selectedQuote.city === "Black Market"
                    ? "Not sold here"
                    : format(selectedQuote.sell_price_min)}
                </dd>
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
          <p className="muted">
            An observed order is a price reference, not a completed trade or a guarantee of stock.
          </p>
          <div className="actions">
            <Link className="button secondary" href={`/tools/flipping?region=${region}`}>
              Plan a trade <ArrowRight size={15} />
            </Link>
            <a className="text-link" href="#market-history-research">
              Research price history
            </a>
          </div>
        </aside>
      )}
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
          <History item={item} quality={Number(quality)} autoLoad />
        ) : (
          <p className="muted">
            Compare current prices or open history to research daily observations. Gaps remain gaps;
            prices are in silver.
          </p>
        )}
      </section>
      <section
        id="market-saved-research"
        className="market-saved-work"
        aria-label="Research and watchlist"
      >
        <div className="market-saved-heading">
          <SlidersHorizontal size={18} />
          <h2>Keep researching</h2>
          <span>Lists stay separate from your city comparison</span>
        </div>
        <div className="market-saved-tabs" role="tablist" aria-label="Saved market work">
          {(
            [
              ["research", "Research list"],
              ["watchlist", "Watchlist"],
            ] as const
          ).map(([key, label], index) => (
            <button
              type="button"
              role="tab"
              id={`${tabId}-${key}-tab`}
              aria-controls={`${tabId}-${key}-panel`}
              aria-selected={savedTab === key}
              tabIndex={savedTab === key ? 0 : -1}
              key={key}
              onClick={() => setSavedTab(key)}
              onKeyDown={(e) => {
                const next =
                  e.key === "ArrowRight" || e.key === "ArrowLeft"
                    ? 1 - index
                    : e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? 1
                        : null;
                if (next === null) return;
                e.preventDefault();
                const tabs =
                  e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                    '[role="tab"]',
                  );
                tabs?.[next]?.click();
                tabs?.[next]?.focus();
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`${tabId}-research-panel`}
          aria-labelledby={`${tabId}-research-tab`}
          hidden={savedTab !== "research"}
        >
          <MarketResearch region={region} itemId={item} quality={Number(quality)} />
        </div>
        <div
          role="tabpanel"
          id={`${tabId}-watchlist-panel`}
          aria-labelledby={`${tabId}-watchlist-tab`}
          hidden={savedTab !== "watchlist"}
        >
          <MarketWatchlist region={region} itemId={item} quality={Number(quality)} />
        </div>
      </section>
    </div>
  );
}
