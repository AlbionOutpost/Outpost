"use client";
import { withBuildRegion } from "@/lib/build-region";
import { ArrowRight, ChevronDown, RotateCw, Search } from "lucide-react";
import { WellSelect } from "./well-select";
import "./market-explorer.css";
import styles from "./market-workspace.module.css";
import { History } from "./history";
import Link from "@/components/link";
import { CatalogItemPicker } from "./catalog-item-picker";
import { ItemVariantPicker, type ItemVariant } from "./item-variant-picker";
import { catalogBaseKey } from "@/lib/catalog/search";
import { MarketCityTable, Skeleton, observedAt } from "./market-city-table";
import { MarketQuoteHero, qualityNames } from "./market-quote-hero";
import { MarketResearch } from "./market-research";
import { MarketWatchlist } from "./market-watchlist";
import { MarketQualityAvailability } from "./market-quality-availability";
import { EmptyWell } from "./empty-well";
import { PanelHead } from "./panel-head";
import { MarketNextSteps } from "./market-next-steps";
import { marketViewTabId, useMarketView } from "./market-view";
import { equipmentName, equipmentSlots } from "@/lib/albion/equipment-catalog";
import { useSearchParams } from "next/navigation";
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
  useSyncExternalStore,
  type RefObject,
} from "react";
import type { MarketPrice } from "@/lib/albion/market-client";
import { sourceTimestamp } from "@/lib/albion/freshness";
import { sourceAge } from "@/lib/albion/source-age";
import { summarizeQuotes } from "@/lib/albion/quote-summary";
import { useOutpostRegion, useRegionNavigationPending } from "./region-context";
import { cities } from "@/lib/albion/region-config";
import { catalogVariantCache, marketPriceCache, withSignal } from "@/lib/client-json-cache";
export function Market() {
  const params = useSearchParams();
  const region = useOutpostRegion();
  const regionPending = useRegionNavigationPending();
  const { view, show } = useMarketView();
  const [item, setItem] = useState(params.get("item") || "T4_BAG");
  const [selectedName, setSelectedName] = useState("");
  // The picked item's tiers and enchantments, read once per base item (not per version).
  const [family, setFamily] = useState<{ key: string; rows: ItemVariant[] } | null>(null);
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
  // A typed identifier waits for the typing to pause; a pick (search, version, quick pick,
  // quality) asks at once.
  const [typed, setTyped] = useState(false);
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
  const main = useRef<HTMLDivElement | null>(null);
  const qualityControl = useRef<HTMLSelectElement | null>(null);
  const current = `${region}:${item.trim().toUpperCase()}:${quality}`;
  useEffect(() => () => controller.current?.abort(), [current]);
  const hasResult = result?.key === current;
  const hasError = error?.key === current;
  // A valid selection without its answer is loading, including the moment before the request
  // goes out: the panels show their skeletons, never the previous item's figures.
  const loading =
    regionPending || pendingKey === current || (validSelectionFor(item) && !hasResult && !hasError);
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
  const placeholderCities = cities
    .filter(
      (name) => (!city || name === city) && (!extraCities.length || extraCities.includes(name)),
    )
    .toSorted((a, b) => a.localeCompare(b));
  // While the next item loads, a selected city keeps its detail well (its figures shimmer).
  const inspectCity =
    selectedQuote?.city ??
    (loading && !hasResult && placeholderCities.includes(selectedCity as (typeof cities)[number])
      ? selectedCity
      : "");
  const selectedItemName = selectedName || equipmentName(item);
  const validSelection = validSelectionFor(item);
  const familyKey = validSelection ? catalogBaseKey(item.trim().toUpperCase()) : "";
  // Any tier names the family; the catalog answers with every version it has.
  const familyUrl = familyKey
    ? `/api/items?${new URLSearchParams({ variants: `T4_${familyKey}` })}`
    : "";
  const knownFamily =
    family?.key === familyKey
      ? family.rows
      : (catalogVariantCache.peek(familyUrl) as { items: ItemVariant[] } | undefined)?.items;
  const variants = knownFamily ?? [];
  // Tiered ids have versions; their picker keeps its place while the family loads.
  const variantsPending = !knownFamily && /^T\d_/.test(item.trim().toUpperCase());
  useEffect(() => {
    if (!familyUrl || catalogVariantCache.peek(familyUrl)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () =>
        withSignal(catalogVariantCache.get(familyUrl), controller.signal)
          .then((body) =>
            setFamily({ key: familyKey, rows: (body as { items: ItemVariant[] }).items }),
          )
          .catch(() => {
            if (!controller.signal.aborted) setFamily({ key: familyKey, rows: [] });
          }),
      typed ? 150 : 0,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [familyKey, familyUrl, typed]);
  const marketLabel =
    city || (extraCities.length ? `${extraCities.length} cities selected` : "All cities");
  async function load({ fresh = false }: { fresh?: boolean } = {}) {
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
    const source = `/api/market?${new URLSearchParams({ region, item: item.trim().toUpperCase(), quality })}`;
    type Answer = { region: string; prices: MarketPrice[] };
    const accept = (data: Answer) => {
      if (data.region !== region) throw new Error("Source region mismatch");
      setResult({ key, region, rows: data.prices, at: Date.now() });
    };
    setError(null);
    // An answer this browser fetched within the server's own cache life shows at once.
    const kept = fresh ? undefined : (marketPriceCache.peek(source) as Answer | undefined);
    if (kept?.region === region) {
      setPendingKey(null);
      accept(kept);
      return;
    }
    setPendingKey(current);
    // A refresh of the same selection keeps the current table on screen until the new
    // observations arrive; a different selection shows no rows (they are keyed by selection).
    setResult((previous) => (previous?.key === key ? previous : null));
    try {
      const data = (await withSignal(
        marketPriceCache.get(source, { fresh }),
        active.signal,
      )) as Answer;
      if (!active.signal.aborted) accept(data);
    } catch (e) {
      if (!active.signal.aborted)
        setError({ key, message: e instanceof Error ? e.message : "Could not load prices" });
    } finally {
      if (controller.current === active) setPendingKey(null);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await load({ fresh: true });
  }
  const loadRef = useRef(load);
  useLayoutEffect(() => {
    loadRef.current = load;
  });
  // Research-first: a valid selection loads its prices as soon as it changes, so arriving
  // with ?item= or picking from the catalog shows city prices without a second click.
  useEffect(() => {
    if (!hydrated || !validSelection || regionPending) return;
    const timer = window.setTimeout(() => void loadRef.current(), typed ? 150 : 0);
    return () => window.clearTimeout(timer);
  }, [current, hydrated, validSelection, regionPending, typed]);
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
  // History loads beside the prices (not after them), so both arrive together.
  const historyOpen = researchOpen ?? validSelection;
  useHeldHeights(main, loading && !hasResult);
  // The panel's own action beside its title, so the chart keeps the room under it.
  const historyToggle = (
    <button
      type="button"
      className="pill-link is-small"
      aria-expanded={historyOpen}
      aria-label={historyOpen ? "Hide price history" : undefined}
      onClick={() => setResearchOpen(!historyOpen)}
    >
      {historyOpen ? "Hide" : "Research price history"}
    </button>
  );
  const sourceNote = (
    <>
      Albion Online Data Project · spread is sell minus buy, as a share of buy · no age: seen within
      the hour · amber age: older · dimmed: over a day · exact UTC time on hover
    </>
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
            <PanelHead title="Search market items" />
            <form id="market-compare-query" className="mx-form" method="post" onSubmit={submit}>
              <CatalogItemPicker
                grouped
                placeholder="Item name, e.g. Bag"
                category={category}
                tier={tier}
                enchantment={enchantment}
                onSelect={(i) => {
                  setTyped(false);
                  setItem(i.id);
                  setSelectedName(i.name);
                  setRailOpen(false);
                }}
              />
              {variantsPending ? (
                // The family's versions are on their way: the picker keeps its place.
                <div className="mx-variants-pending" inert aria-hidden="true">
                  <ItemVariantPicker className="mx-variants" variants={[]} current="" />
                </div>
              ) : (
                variants.length > 1 && (
                  <ItemVariantPicker
                    key={familyKey}
                    className="mx-variants"
                    variants={variants}
                    current={item.trim().toUpperCase()}
                    onSelect={(variant) => {
                      setTyped(false);
                      setItem(variant.id);
                      setSelectedName(variant.name ?? "");
                    }}
                  />
                )
              )}
              <div className="market-start-examples mx-picks" aria-label="Suggested market items">
                <span>Quick picks</span>
                {[
                  { id: "T4_BAG", name: "Bag" },
                  { id: "T4_MAIN_AXE", name: "Battleaxe" },
                  { id: "T4_CAPE", name: "Cape" },
                  { id: "T6_METALBAR", name: "Steel Bar" },
                ]
                  // By family, so a version picked of a quick pick keeps the same three here.
                  .filter((preset) => catalogBaseKey(preset.id) !== familyKey)
                  .slice(0, 3)
                  .map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      className="mx-pill"
                      onClick={() => {
                        setTyped(false);
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
                  <WellSelect
                    aria-label="Quality"
                    ref={qualityControl}
                    value={quality}
                    onChange={(e) => {
                      setTyped(false);
                      setQuality(e.target.value);
                    }}
                  >
                    {qualityNames.map((x, i) => (
                      <option value={i + 1} key={x}>
                        {x}
                      </option>
                    ))}
                  </WellSelect>
                </label>
                <label className="mx-field">
                  <span>Market city</span>
                  <WellSelect
                    aria-label="Market city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  >
                    <option value="">All cities</option>
                    {cities.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </WellSelect>
                </label>
              </div>
              <button
                className="button primary mx-refresh"
                disabled={!hydrated || loading || !validSelection}
              >
                <RotateCw size={16} aria-hidden="true" />
                {hydrated && loading ? "Fetching observations…" : "Refresh prices"}
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
                    <WellSelect
                      aria-label="Item category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">All categories</option>
                      {equipmentSlots.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </WellSelect>
                  </label>
                  <label className="mx-field">
                    <span>Item tier</span>
                    <WellSelect
                      aria-label="Market item tier"
                      value={tier}
                      onChange={(e) => setTier(e.target.value)}
                    >
                      <option value="">All tiers</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </WellSelect>
                  </label>
                  <label className="mx-field">
                    <span>Enchantment</span>
                    <WellSelect
                      aria-label="Market enchantment"
                      value={enchantment}
                      onChange={(e) => setEnchantment(e.target.value)}
                    >
                      <option value="">All enchantments</option>
                      {[0, 1, 2, 3, 4].map((t) => (
                        <option key={t} value={t}>
                          {t ? `@${t}` : "Flat"}
                        </option>
                      ))}
                    </WellSelect>
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
                      setTyped(true);
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
            {/* A valid selection loads on its own; this only explains an unfinished identifier */}
            {result && result.key !== current && !validSelection && (
              <p role="status" className="mx-note">
                {result.region !== region ? "Region changed." : "Selection changed."} Request new
                observations for the selected item and quality.
              </p>
            )}
          </fieldset>
        </aside>
        <div className="mx-main" ref={main}>
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
              onRetry={() => void load({ fresh: true })}
              loading={loading && !hasResult}
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
                    {((hasResult && summary.available > 0) || (loading && !hasResult)) && (
                      <div className="segmented" role="radiogroup" aria-label="Sort market prices">
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
                            disabled={!hasResult}
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
                    selectedCity={inspectCity}
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
              {inspectCity && (
                <aside
                  className="mx-inspector"
                  aria-label="Selected city observation"
                  aria-busy={!selectedQuote}
                >
                  <div className="mx-inspector-head">
                    <span className="city-dot" data-city={inspectCity} aria-hidden="true" />
                    <h3>{inspectCity}</h3>
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
                            {inspectCity === "Black Market" ? (
                              "Not sold here"
                            ) : !selectedQuote ? (
                              <Skeleton>0,000</Skeleton>
                            ) : selectedQuote.sell_price_min ? (
                              selectedQuote.sell_price_min.toLocaleString("en-US")
                            ) : (
                              "Not observed"
                            )}
                          </span>
                          <small>
                            {!selectedQuote ? (
                              <Skeleton>2026-01-01 00:00 UTC · 1 min ago</Skeleton>
                            ) : selectedQuote.sell_price_min ? (
                              `${observedAt(selectedQuote.sell_price_min_date)} UTC · ${sourceAge(selectedQuote.sell_price_min_date, now).label}`
                            ) : (
                              "No observation"
                            )}
                          </small>
                        </dd>
                      </div>
                      <div>
                        <dt>Buy order</dt>
                        <dd>
                          <span className="numeric">
                            {!selectedQuote ? (
                              <Skeleton>0,000</Skeleton>
                            ) : selectedQuote.buy_price_max ? (
                              selectedQuote.buy_price_max.toLocaleString("en-US")
                            ) : (
                              "Not observed"
                            )}
                          </span>
                          <small>
                            {!selectedQuote ? (
                              <Skeleton>2026-01-01 00:00 UTC · 1 min ago</Skeleton>
                            ) : selectedQuote.buy_price_max ? (
                              `${observedAt(selectedQuote.buy_price_max_date)} UTC · ${sourceAge(selectedQuote.buy_price_max_date, now).label}`
                            ) : (
                              "No observation"
                            )}
                          </small>
                        </dd>
                      </div>
                    </dl>
                  </section>
                  <div className="mx-inspector-actions">
                    <Link
                      className="pill-link is-small"
                      href={withBuildRegion("/tools/flipping", region)}
                    >
                      Plan a trade <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      className="pill-link is-small"
                      onClick={() => show("history")}
                    >
                      {inspectCity} price history
                    </button>
                  </div>
                </aside>
              )}
              {!hasResult && (
                // The table keeps its shape while there is nothing to show: one row per city in
                // the filter, shimmering while observations load, "Unavailable" otherwise.
                <MarketCityTable
                  rows={placeholderCities.map((name) => ({
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
                  selectedCity={inspectCity}
                  onSelect={() => {}}
                  missingLabel="Unavailable"
                  loading={loading}
                  now={0}
                />
              )}
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
              {hasResult || loading ? (
                <MarketQualityAvailability
                  region={region}
                  item={item}
                  city={city || (extraCities.length === 1 ? extraCities[0] : "")}
                  quality={quality}
                  note={sourceNote}
                  onChoose={(next) => {
                    setTyped(false);
                    setQuality(next);
                    requestAnimationFrame(() => qualityControl.current?.focus());
                  }}
                />
              ) : (
                <p className="market-source-note mx-source">{sourceNote}</p>
              )}
            </section>
          </div>
          {/* The side column: one panel at a time, picked by the masthead tabs */}
          <section
            className="raised reference-market-history mx-history"
            id="market-history-research"
            role="tabpanel"
            aria-labelledby={marketViewTabId("history")}
            hidden={view !== "history"}
          >
            <PanelHead
              id="market-history-title"
              title="Price history"
              line={<>Daily sell-order averages · {qualityNames[Number(quality) - 1]}</>}
              actions={historyToggle}
            />
            {historyOpen ? (
              <History
                item={item}
                quality={Number(quality)}
                autoLoad
                delay={typed ? 150 : 0}
                embedded
                city={historyCity}
                onCityChange={setHistoryCity}
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
            role="tabpanel"
            aria-labelledby={marketViewTabId("saved")}
            hidden={view !== "saved"}
          >
            <PanelHead
              id="market-saved-title"
              title="Keep researching"
              line={<>Shortlist several items, or save them to your watchlist</>}
              actions={
                <>
                  <div
                    className="segmented market-saved-tabs"
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

const validSelectionFor = (item: string) => /^[A-Z0-9_@]{3,100}$/.test(item.trim().toUpperCase());

/** While the next selection loads, the hero, the City orders well and Price history keep at
 * least the height they had with the last answer. The skeletons match the answer's shape; this
 * covers what they cannot know, such as ages that wrap to a second line in a phone's narrow
 * cells, so a switch never collapses a panel. */
const heldPanels = [".mx-hero", ".mx-board > .mx-table-well", ".mx-history"];
function useHeldHeights(root: RefObject<HTMLElement | null>, holding: boolean) {
  const heights = useRef<number[]>([]);
  useLayoutEffect(() => {
    heldPanels.forEach((selector, i) => {
      const panel = root.current?.querySelector<HTMLElement>(selector);
      if (!panel) return;
      if (!holding) {
        panel.style.minHeight = "";
        heights.current[i] = panel.getBoundingClientRect().height;
      } else if (heights.current[i]) panel.style.minHeight = `${heights.current[i]}px`;
    });
  });
}
