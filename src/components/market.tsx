"use client";
import { ArrowRight, ChevronDown, RotateCw, Search } from "lucide-react";
import "./market-explorer.css";
import styles from "./market-workspace.module.css";
import { History } from "./history";
import Link from "@/components/link";
import { CatalogItemPicker } from "./catalog-item-picker";
import { MarketCityTable, observedAt } from "./market-city-table";
import { MarketQuoteHero, qualityNames } from "./market-quote-hero";
import { MarketResearch } from "./market-research";
import { MarketWatchlist } from "./market-watchlist";
import { MarketQualityAvailability } from "./market-quality-availability";
import { EmptyWell } from "./empty-well";
import { PanelHead } from "./panel-head";
import { MarketNextSteps } from "./market-next-steps";
import { equipmentName, equipmentSlots } from "@/lib/albion/equipment-catalog";
import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useLayoutEffect, useId, useSyncExternalStore } from "react";
import type { MarketPrice } from "@/lib/albion/market-client";
import { sourceTimestamp } from "@/lib/albion/freshness";
import { sourceAge } from "@/lib/albion/source-age";
import { summarizeQuotes } from "@/lib/albion/quote-summary";
import { useOutpostRegion, useRegionNavigationPending } from "./region-context";
import { cities } from "@/lib/albion/region-config";
export function Market() {
  const params = useSearchParams();
  const region = useOutpostRegion();
  const regionPending = useRegionNavigationPending();
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
  const [result, setResult] = useState<{
    key: string;
    region: string;
    rows: MarketPrice[];
    at: number;
  } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [city, setCity] = useState(() => cities.find((name) => name === params.get("city")) || "");
  const [researchOpen, setResearchOpen] = useState<boolean | null>(null);
  const [selectedCity, setSelectedCity] = useState("");
  const [historyCity, setHistoryCity] = useState("Lymhurst");
  const [extraCities, setExtraCities] = useState<string[]>(() => [
    ...new Set(
      (params.get("cities") || "")
        .split(",")
        .filter((city) => cities.includes(city as (typeof cities)[number])),
    ),
  ]);
  const [sort, setSort] = useState("city");
  const [savedTab, setSavedTab] = useState<"research" | "watchlist">("research");
  // Phones: the search rail folds into one "Change item" bar so the answer comes first.
  const [railOpen, setRailOpen] = useState(false);
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
  const loading = regionPending || pendingKey === current;
  const hasResult = result?.key === current;
  const hasError = error?.key === current;
  const rows = result?.key === current ? result.rows : [];
  const summary = summarizeQuotes(rows);
  const now = result?.at ?? 0;
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
  const validSelection = /^[A-Z0-9_@]{3,100}$/.test(item.trim().toUpperCase());
  const marketLabel =
    city || (extraCities.length ? `${extraCities.length} cities selected` : "All cities");
  async function load() {
    // Wait for the router's push before native URL synchronization; otherwise a
    // queued refresh can replace the previous region's browser-history entry.
    if (regionPending) return;
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
    // A refresh of the same selection keeps the current table on screen until the new
    // observations arrive; a different selection shows no rows (they are keyed by selection).
    setResult((previous) => (previous?.key === key ? previous : null));
    try {
      const response = await fetch(
        `/api/market?${new URLSearchParams({ region, item: item.trim().toUpperCase(), quality })}`,
        { signal: active.signal },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.region !== region) throw new Error("Source region mismatch");
      if (!active.signal.aborted) setResult({ key, region, rows: data.prices, at: Date.now() });
    } catch (e) {
      if (!active.signal.aborted)
        setError({ key, message: e instanceof Error ? e.message : "Could not load prices" });
    } finally {
      if (controller.current === active) setPendingKey(null);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await load();
  }
  const loadRef = useRef(load);
  useLayoutEffect(() => {
    loadRef.current = load;
  });
  // Research-first: a valid selection loads its prices as soon as it changes, so arriving
  // with ?item= or picking from the catalog shows city prices without a second click.
  useEffect(() => {
    if (!hydrated || !validSelection || regionPending) return;
    const timer = window.setTimeout(() => void loadRef.current(), 150);
    return () => window.clearTimeout(timer);
  }, [current, hydrated, validSelection, regionPending]);
  const newest = visible
    .flatMap((r) => [
      ...(r.sell_price_min ? [{ city: r.city, date: r.sell_price_min_date }] : []),
      ...(r.buy_price_max ? [{ city: r.city, date: r.buy_price_max_date }] : []),
    ])
    .filter((o) => Number.isFinite(sourceTimestamp(o.date)))
    .reduce<{ city: string; date: string } | null>(
      (best, o) => (!best || sourceTimestamp(o.date) > sourceTimestamp(best.date) ? o : best),
      null,
    );
  const visibleSummary = summarizeQuotes(visible);
  const heroStatus = loading
    ? "Checking the markets…"
    : hasError
      ? "Prices could not load right now. Your selection is kept."
      : hasResult
        ? "No orders observed for this selection yet."
        : validSelection
          ? "City prices load as soon as you pick an item."
          : "Choose an item to see its city prices.";
  const selectCity = (next: string) => {
    setSelectedCity(next);
    if (next) setHistoryCity(next);
  };
  const filtersActive =
    extraCities.length > 0 || city || tier || category || enchantment || quality !== "1";
  const historyOpen = researchOpen ?? hasResult;
  // Closed, the toggle is the panel's action; open, it joins Refresh on the history controls row.
  const historyToggle = (
    <button
      type="button"
      className="pill-link is-small"
      aria-expanded={historyOpen}
      onClick={() => setResearchOpen(!historyOpen)}
    >
      {historyOpen ? "Hide price history" : "Research price history"}
    </button>
  );
  return (
    <>
      <div
        className={`mx ${styles.workspace}${hasResult ? " has-results" : " is-setup"}`}
        aria-busy={loading}
      >
        <aside
          className="raised mx-rail"
          aria-label="Market search and filters"
          data-open={railOpen ? "" : undefined}
        >
          <button
            type="button"
            className="mx-rail-toggle"
            aria-expanded={railOpen}
            aria-controls={`${tabId}-rail`}
            onClick={() => setRailOpen(!railOpen)}
          >
            <Search size={18} aria-hidden="true" />
            <span>
              Change item
              <small>
                {qualityNames[Number(quality) - 1]} · {marketLabel}
              </small>
            </span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          <fieldset id={`${tabId}-rail`} className="market-hydration-guard" disabled={!hydrated}>
            <legend className="sr-only">Choose an item, quality and city</legend>
            <PanelHead
              title="Search market items"
              line="Pick an item, then its quality and city."
            />
            <form id="market-compare-query" className="mx-form" method="post" onSubmit={submit}>
              <CatalogItemPicker
                category={category}
                tier={tier}
                enchantment={enchantment}
                onSelect={(i) => {
                  setItem(i.id);
                  setSelectedName(i.name);
                  setRailOpen(false);
                }}
              />
              <div className="market-start-examples mx-picks" aria-label="Suggested market items">
                <span>Quick picks</span>
                {[
                  { id: "T4_BAG", name: "Bag" },
                  { id: "T4_MAIN_AXE", name: "Battleaxe" },
                  { id: "T4_CAPE", name: "Cape" },
                  { id: "T6_METALBAR", name: "Steel Bar" },
                ]
                  .filter((preset) => preset.id !== item)
                  .slice(0, 3)
                  .map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      className="mx-pill"
                      onClick={() => {
                        setItem(preset.id);
                        setSelectedName(preset.name);
                        setRailOpen(false);
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
              </div>
              <div className="mx-field-pair">
                <label className="mx-field">
                  <span>Quality</span>
                  <span className="mx-select">
                    <select
                      aria-label="Quality"
                      ref={qualityControl}
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                    >
                      {qualityNames.map((x, i) => (
                        <option value={i + 1} key={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} aria-hidden="true" />
                  </span>
                </label>
                <label className="mx-field">
                  <span>Market city</span>
                  <span className="mx-select">
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
                    <ChevronDown size={16} aria-hidden="true" />
                  </span>
                </label>
              </div>
              <button
                className="button primary mx-refresh"
                disabled={!hydrated || loading || !validSelection}
              >
                <RotateCw size={16} aria-hidden="true" />
                {loading ? "Fetching observations…" : "Refresh prices"}
              </button>
            </form>
            <div className="mx-disclosures">
              <details className="reference-city-filter mx-disclosure">
                <summary>
                  Compare cities
                  <em>{extraCities.length ? `${extraCities.length} selected` : "All"}</em>
                </summary>
                <div className="reference-city-options mx-city-toggles">
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
                      <span className="city-dot" data-city={name} aria-hidden="true" />
                      {name}
                    </label>
                  ))}
                </div>
              </details>
              <details className="market-catalog-filters mx-disclosure">
                <summary>
                  Item filters
                  <em>
                    {[category, tier && `T${tier}`, enchantment && `.${enchantment}`]
                      .filter(Boolean)
                      .join(" · ") || "Any"}
                  </em>
                </summary>
                <div className="mx-filter-grid">
                  <label className="mx-field">
                    <span>Item category</span>
                    <span className="mx-select">
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
                      <ChevronDown size={16} aria-hidden="true" />
                    </span>
                  </label>
                  <label className="mx-field">
                    <span>Item tier</span>
                    <span className="mx-select">
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
                      <ChevronDown size={16} aria-hidden="true" />
                    </span>
                  </label>
                  <label className="mx-field">
                    <span>Enchantment</span>
                    <span className="mx-select">
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
                      <ChevronDown size={16} aria-hidden="true" />
                    </span>
                  </label>
                </div>
              </details>
              <details className="market-advanced mx-disclosure">
                <summary>Advanced item identifier</summary>
                <label className="mx-field">
                  <span>Item identifier</span>
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
            {filtersActive && (
              <div className="reference-filter-chips mx-active-filters">
                {extraCities.map((name) => (
                  <button
                    type="button"
                    className="mx-pill is-on"
                    key={name}
                    aria-label={`Remove ${name} filter`}
                    onClick={() => setExtraCities(extraCities.filter((c) => c !== name))}
                  >
                    <span className="city-dot" data-city={name} aria-hidden="true" />
                    {name} ×
                  </button>
                ))}
                <button
                  type="button"
                  className="mx-reset"
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
              </div>
            )}
            {result && result.key !== current && (
              <p role="status" className="mx-note">
                {result.region !== region ? "Region changed." : "Selection changed."} Request new
                observations for the selected item and quality.
              </p>
            )}
          </fieldset>
        </aside>
        <div className="mx-main">
          <div className={`raised ${styles.marketDesk}`}>
            <MarketQuoteHero
              item={item}
              name={selectedItemName}
              quality={quality}
              region={region}
              scope={marketLabel}
              summary={
                // Once observations are in, the figures stay (an em dash where none was seen).
                hasResult ? { ask: visibleSummary.ask, bid: visibleSummary.bid } : null
              }
              newest={newest}
              status={heroStatus}
              failed={hasError && !loading}
              onRetry={() => void load()}
              now={now}
            />
            <section className="raised market-board mx-board" aria-labelledby="market-board-title">
              <PanelHead
                id="market-board-title"
                title="City orders"
                line={
                  <>
                    {hasResult && summary.available > 0
                      ? `${visible.length} ${visible.length === 1 ? "city" : "cities"} · ${summary.stale} of ${summary.available} orders older than an hour`
                      : loading
                        ? "Requesting observations"
                        : hasError || hasResult
                          ? marketLabel
                          : validSelection
                            ? `${marketLabel} · ready to compare`
                            : "Choose an item to continue"}
                  </>
                }
                actions={
                  <>
                    {hasResult && summary.available > 0 && (
                      <div className="mx-segment" role="radiogroup" aria-label="Sort market prices">
                        {(
                          [
                            ["city", "City"],
                            ["sell", "Lowest sell"],
                            ["buy", "Highest buy"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            type="button"
                            role="radio"
                            aria-checked={sort === value}
                            key={value}
                            onClick={() => setSort(value)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                }
              />
              {hasResult && summary.available > 0 && (
                <>
                  <MarketCityTable
                    rows={visible}
                    ask={visibleSummary.ask}
                    bid={visibleSummary.bid}
                    selectedCity={selectedQuote?.city ?? ""}
                    onSelect={selectCity}
                    now={now}
                  />
                  {!visible.length && (
                    <EmptyWell
                      title="No city matches these filters"
                      line="The item has orders in other cities."
                      action={
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => {
                            setCity("");
                            setExtraCities([]);
                          }}
                        >
                          Show every city
                        </button>
                      }
                    />
                  )}
                </>
              )}
              {selectedQuote && (
                <aside className="mx-inspector" aria-label="Selected city observation">
                  <div className="mx-inspector-head">
                    <span className="city-dot" data-city={selectedQuote.city} aria-hidden="true" />
                    <h3>{selectedQuote.city}</h3>
                    <button type="button" className="mx-reset" onClick={() => setSelectedCity("")}>
                      Close details
                    </button>
                  </div>
                  <section className="reference-city-summary" aria-live="polite">
                    <dl>
                      <div>
                        <dt>Sell order</dt>
                        <dd>
                          <span className="numeric">
                            {selectedQuote.city === "Black Market"
                              ? "Not sold here"
                              : selectedQuote.sell_price_min
                                ? selectedQuote.sell_price_min.toLocaleString("en-US")
                                : "Not observed"}
                          </span>
                          <small>
                            {selectedQuote.sell_price_min
                              ? `${observedAt(selectedQuote.sell_price_min_date)} UTC · ${sourceAge(selectedQuote.sell_price_min_date, now).label}`
                              : "No observation"}
                          </small>
                        </dd>
                      </div>
                      <div>
                        <dt>Buy order</dt>
                        <dd>
                          <span className="numeric">
                            {selectedQuote.buy_price_max
                              ? selectedQuote.buy_price_max.toLocaleString("en-US")
                              : "Not observed"}
                          </span>
                          <small>
                            {selectedQuote.buy_price_max
                              ? `${observedAt(selectedQuote.buy_price_max_date)} UTC · ${sourceAge(selectedQuote.buy_price_max_date, now).label}`
                              : "No observation"}
                          </small>
                        </dd>
                      </div>
                    </dl>
                  </section>
                  <div className="mx-inspector-actions">
                    <Link className="pill-link is-small" href={`/tools/flipping?region=${region}`}>
                      Plan a trade <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <a className="pill-link is-small" href="#market-history-research">
                      {selectedQuote.city} price history
                    </a>
                  </div>
                </aside>
              )}
              {!hasResult &&
                (loading ? (
                  <div className="mx-skeleton" aria-hidden="true">
                    {Array.from({ length: 6 }, (_, i) => (
                      <span key={i} />
                    ))}
                  </div>
                ) : (
                  // The table keeps its shape while there is nothing to show; the hero says why.
                  <MarketCityTable
                    rows={cities.map((name) => ({
                      item_id: item,
                      city: name,
                      quality: Number(quality),
                      sell_price_min: 0,
                      sell_price_min_date: "",
                      buy_price_max: 0,
                      buy_price_max_date: "",
                    }))}
                    ask={null}
                    bid={null}
                    selectedCity=""
                    onSelect={() => {}}
                    missingLabel="Unavailable"
                    now={0}
                  />
                ))}
              {hasResult && !summary.available && (
                <EmptyWell
                  title="No orders seen for this item yet"
                  line="Prices appear once a player running the Albion Online Data Project client opens this market. A gap is not a zero price."
                  action={
                    <Link
                      className="pill-link is-small"
                      href={`/market-data?${new URLSearchParams({ region, item, quality, ...(city ? { city } : {}) })}`}
                    >
                      Fill a missing price <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  }
                />
              )}
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
              <p className="market-source-note mx-source">
                Albion Online Data Project · sell orders are listings, buy orders are offers ·
                spread is sell minus buy, as a share of buy · older than an hour is marked stale ·
                times in UTC
              </p>
            </section>
          </div>
          <section
            className="raised reference-market-history mx-history"
            id="market-history-research"
            aria-labelledby="market-history-title"
          >
            <PanelHead
              id="market-history-title"
              title="Price history"
              line={
                <>
                  Daily sell-order averages · {qualityNames[Number(quality) - 1]} · not confirmed
                  trades
                </>
              }
              actions={!historyOpen && historyToggle}
            />
            {historyOpen ? (
              <History
                item={item}
                quality={Number(quality)}
                autoLoad
                embedded
                city={historyCity}
                onCityChange={setHistoryCity}
                actions={historyToggle}
              />
            ) : (
              <p className="mx-collapsed-note">
                Open history to see how the sell-order average moved over the last 7 or 30 days.
                Gaps stay gaps.
              </p>
            )}
          </section>
          <section
            id="market-saved-research"
            className="raised mx-saved"
            aria-labelledby="market-saved-title"
          >
            <PanelHead
              id="market-saved-title"
              title="Keep researching"
              line={<>Shortlist several items, or save them to your watchlist</>}
              actions={
                <>
                  <div
                    className="mx-segment market-saved-tabs"
                    role="tablist"
                    aria-label="Saved market work"
                  >
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
                </>
              }
            />
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
      </div>
      <MarketNextSteps show={["flipping", "crafting", "planner"]} />
    </>
  );
}
