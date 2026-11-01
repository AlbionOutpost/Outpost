"use client";
import { CalculationReadiness } from "./calculation-readiness";
import { useEffect, useId, useRef, useState } from "react";
import { Fish, RefreshCw, Search } from "lucide-react";
import { fishConversion, fishFame, type FishReference } from "@/lib/albion/fishing";
import { cities } from "@/lib/albion/region-config";
import { isStale, sourceTimestamp } from "@/lib/albion/freshness";
import { useBatchQuotes, quoteKey } from "./market-batch-quotes";
import { useAtlasRegion } from "./region-context";
import { ItemIcon } from "./item-icon";
const amount = (value: number | null | undefined) =>
  value === null || value === undefined
    ? "—"
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
export function FishingCalculator({
  fish,
  initialMode = "chopping",
  compact = false,
}: {
  fish: FishReference[];
  initialMode?: "chopping" | "leveling";
  compact?: boolean;
}) {
  const region = useAtlasRegion();
  const instance = useId();
  const [selectedId, setSelectedId] = useState(
    fish.find((f) => f.id === "T3_FISH_FRESHWATER_ALL_COMMON")?.id || fish[0].id,
  );
  const [mode, setMode] = useState(initialMode);
  const [city, setCity] = useState("Fort Sterling");
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [target, setTarget] = useState(100000);
  const [purchaseFee, setPurchaseFee] = useState("0");
  const [saleFee, setSaleFee] = useState("");
  const [processingCost, setProcessingCost] = useState("0");
  const [saleBasis, setSaleBasis] = useState<"bid" | "ask">("bid");
  const [manual, setManual] = useState<Record<string, string>>({});
  const { quotes, busy, refresh } = useBatchQuotes(region);
  // One batch covers every fish and chops across cities, so it loads once per server.
  const refreshAll = () =>
    refresh([
      ...fish.map((f) => ({ itemId: f.id, quality: 1 })),
      { itemId: "T1_FISHCHOPS", quality: 1 },
    ]);
  const refreshRef = useRef(refreshAll);
  useEffect(() => {
    refreshRef.current = refreshAll;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => void refreshRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [region]);
  const selected = fish.find((f) => f.id === selectedId) || fish[0];
  const prefix = `${region}:${city}:${selected.id}:`;
  const fieldKey = (key: string) => prefix + key;
  const edit = (key: string, value: string) =>
    setManual((previous) => ({ ...previous, [fieldKey(key)]: value }));
  const selectedQuote = quotes[quoteKey({ itemId: selected.id, quality: 1 })];
  function sourcePrice(id: string, side: "bid" | "ask") {
    const quote = quotes[quoteKey({ itemId: id, quality: 1 })];
    const row = quote?.prices.find((p) => p.city === city);
    const value = side === "ask" ? row?.sell_price_min : row?.buy_price_max;
    const observedAt = side === "ask" ? row?.sell_price_min_date : row?.buy_price_max_date;
    const date =
      value && value > 0 && observedAt && Number.isFinite(sourceTimestamp(observedAt))
        ? observedAt
        : undefined;
    const stale = !!date && isStale(date);
    return {
      value: value && value > 0 && date && !stale ? value : null,
      date,
      stale,
      error: quote?.error,
    };
  }
  function priceValue(key: string, id: string, side: "bid" | "ask") {
    return Object.hasOwn(manual, fieldKey(key))
      ? manual[fieldKey(key)]
      : String(sourcePrice(id, side).value ?? "");
  }
  const number = (value: string) => (value === "" ? null : Number(value));
  const purchase = number(priceValue("purchase", selected.id, "ask"));
  const rawSale = number(priceValue("raw-sale", selected.id, saleBasis));
  const choppedSale = number(priceValue("chop-sale", "T1_FISHCHOPS", saleBasis));
  const yieldValue = Object.hasOwn(manual, fieldKey("yield"))
    ? manual[fieldKey("yield")]
    : String(selected.choppedPerFish);
  const fameValue = Object.hasOwn(manual, fieldKey("fame"))
    ? manual[fieldKey("fame")]
    : String(selected.historicalFame ?? "");
  let conversion: ReturnType<typeof fishConversion> | null = null,
    leveling: ReturnType<typeof fishFame> | null = null,
    error = "";
  try {
    if (mode === "chopping" && saleFee !== "")
      conversion = fishConversion({
        quantity,
        choppedPerFish: Number(yieldValue),
        purchasePrice: purchase,
        rawSalePrice: rawSale,
        choppedSalePrice: choppedSale,
        purchaseFee: Number(purchaseFee),
        saleFee: Number(saleFee),
        choppingCost: Number(processingCost),
      });
    if (mode === "leveling")
      leveling = fishFame({
        target,
        famePerFish: number(fameValue),
        purchasePrice: purchase,
        purchaseFee: Number(purchaseFee),
      });
  } catch {
    error =
      "Check quantities, prices, fees and your yield/fame assumptions. Keep totals under one trillion silver.";
  }
  function priceField(key: string, label: string, id: string, side: "bid" | "ask") {
    const manualValue = Object.hasOwn(manual, fieldKey(key)),
      source = sourcePrice(id, side);
    return (
      <label className="fishing-price-field">
        {label}
        <input
          type="number"
          aria-label={label}
          aria-describedby={`${instance}-${key}-source`}
          min={0}
          max={1e12}
          step="any"
          value={priceValue(key, id, side)}
          placeholder="Enter silver or load prices"
          onChange={(event) => edit(key, event.target.value)}
        />
        <small id={`${instance}-${key}-source`}>
          {manualValue
            ? "Manual price · retained on refresh"
            : source.date
              ? `${source.stale ? "Stale · enter a price" : "AODP observation"} · ${new Date(sourceTimestamp(source.date)).toLocaleString("en-GB", { timeZone: "UTC" })} UTC`
              : "No usable observation loaded"}
        </small>
      </label>
    );
  }
  const matches = fish.filter((f) =>
    `${f.name} ${f.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section
      className={`fishing-workspace${compact ? " compact" : ""}`}
      aria-label="Fishing calculator"
    >
      {!compact && (
        <aside className="fishing-browser">
          <h2>Choose your catch</h2>
          <label>
            <span>
              <Search size={14} /> Find a fish
            </span>
            <input
              type="search"
              value={query}
              maxLength={100}
              placeholder="Perch, eel, sturgeon…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div>
            {matches.map((f) => (
              <button
                type="button"
                key={f.id}
                aria-pressed={selected.id === f.id}
                onClick={() => setSelectedId(f.id)}
              >
                <ItemIcon id={f.id} size={40} />
                <span>
                  {f.name}
                  <small>
                    T{f.tier} · {f.choppedPerFish} chopped fish
                  </small>
                </span>
              </button>
            ))}
          </div>
          {!matches.length && <p>No fish matches that search.</p>}
        </aside>
      )}
      <div className="fishing-main">
        <nav className="fishing-use" aria-label="Use your catch">
          <button
            type="button"
            aria-pressed={mode === "chopping"}
            onClick={() => setMode("chopping")}
          >
            Chop or sell
          </button>
          <button
            type="button"
            aria-pressed={mode === "leveling"}
            onClick={() => setMode("leveling")}
          >
            Fishing fame
          </button>
        </nav>
        <div className="fishing-selected">
          <ItemIcon id={selected.id} size={96} />
          <div>
            <h2>{selected.name}</h2>
            <span>
              T{selected.tier} · {region} · Normal quality
            </span>
            <label>
              Selected fish
              <select
                aria-label="Selected fish"
                value={selected.id}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {fish.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="fishing-source-toolbar">
          <label>
            Market city
            <select
              aria-label="Fishing market city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {cities
                .filter((c) => c !== "Black Market")
                .map((c) => (
                  <option key={c}>{c}</option>
                ))}
            </select>
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => void refreshAll()}
          >
            <RefreshCw size={14} />
            {busy ? "Checking markets…" : "Refresh fish observations"}
          </button>
        </div>
        {selectedQuote?.error && (
          <p role="status" className="fishing-source-message">
            {selectedQuote.error} Last observations keep their original dates.
          </p>
        )}
        <div className="fishing-inputs">
          {priceField("purchase", "Raw fish purchase price", selected.id, "ask")}
          {mode === "chopping" ? (
            <>
              {priceField("raw-sale", "Raw fish sale price", selected.id, saleBasis)}
              {priceField("chop-sale", "Chopped fish sale price", "T1_FISHCHOPS", saleBasis)}
              <label>
                Fish quantity
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </label>
              <label>
                Chopped fish per raw fish
                <input
                  type="number"
                  aria-label="Chopped fish per raw fish"
                  min={1}
                  max={10000}
                  value={yieldValue}
                  onChange={(e) => edit("yield", e.target.value)}
                />
                <small>
                  Chops per fish: {selected.choppedPerFish}. Confirm your yield in game.
                </small>
              </label>
              <label>
                Total sale fees (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={saleFee}
                  placeholder="Enter your tax + listing fees"
                  onChange={(e) => setSaleFee(e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Target fishing fame
                <input
                  type="number"
                  min={1}
                  max={1e12}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                />
              </label>
              <label>
                Fame per consumed fish
                <input
                  type="number"
                  min={0}
                  max={1e9}
                  step="any"
                  aria-label="Fame per consumed fish"
                  value={fameValue}
                  placeholder="Enter your actual fame"
                  onChange={(e) => edit("fame", e.target.value)}
                />
                <small>
                  Starting value is historical Premium fame. Use your actual in-game value.
                </small>
              </label>
            </>
          )}
        </div>
        <details className="fishing-fee-settings">
          <summary>Price basis & extra costs</summary>
          <div>
            <label>
              Purchase order fee (%)
              <input
                type="number"
                min={0}
                max={100}
                step="any"
                value={purchaseFee}
                onChange={(e) => setPurchaseFee(e.target.value)}
              />
            </label>
            {mode === "chopping" && (
              <>
                <label>
                  Total chopping cost · silver
                  <input
                    type="number"
                    min={0}
                    max={1e12}
                    step="any"
                    value={processingCost}
                    onChange={(e) => setProcessingCost(e.target.value)}
                  />
                </label>
                <label>
                  Observed sale-price side
                  <select
                    value={saleBasis}
                    onChange={(e) => setSaleBasis(e.target.value as "bid" | "ask")}
                  >
                    <option value="bid">Highest buy order · instant sale</option>
                    <option value="ask">Lowest sell listing · planned sell order</option>
                  </select>
                </label>
              </>
            )}
            <button
              type="button"
              className="text-link"
              onClick={() =>
                setManual((previous) =>
                  Object.fromEntries(
                    Object.entries(previous).filter(([key]) => !key.startsWith(prefix)),
                  ),
                )
              }
            >
              Clear this fish’s manual overrides
            </button>
          </div>
          <p>
            Fees and extra costs are your assumptions. Observations do not guarantee available stock
            or trade execution.
          </p>
        </details>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="fishing-results" aria-live="polite">
          {((mode === "chopping" &&
            (saleFee === "" || purchase === null || rawSale === null || choppedSale === null)) ||
            (mode === "leveling" && (purchase === null || fameValue === ""))) && (
            <CalculationReadiness
              title={
                mode === "chopping"
                  ? "Complete the chop-or-sell comparison"
                  : "Price your fame target"
              }
              missing={[
                ...(purchase === null ? ["Fish purchase price"] : []),
                ...(mode === "chopping" && rawSale === null ? ["Whole fish sale price"] : []),
                ...(mode === "chopping" && choppedSale === null ? ["Chopped fish sale price"] : []),
                ...(mode === "chopping" && saleFee === "" ? ["Sale fees (%)"] : []),
                ...(mode === "leveling" && fameValue === "" ? ["Fame per consumed fish"] : []),
              ]}
            >
              Use your own prices, or load observations for the selected server and city.
            </CalculationReadiness>
          )}

          {mode === "chopping" ? (
            <>
              <div className="fishing-result-heading">
                <Fish size={20} />
                <div>
                  <h3>Is it worth chopping?</h3>
                  <p>
                    {saleFee === ""
                      ? "Enter your sale fees to compare the net returns."
                      : "Compare processing with selling the same catch whole."}
                  </p>
                </div>
              </div>
              {conversion && (
                <dl>
                  <div>
                    <dt>Chopped output</dt>
                    <dd>
                      {amount(conversion?.quantity)} <small>chopped fish</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Buy-and-chop cash profit</dt>
                    <dd data-result="fish-chop-profit">
                      {amount(conversion?.choppedProfit)} <small>silver</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Buy-and-sell raw profit</dt>
                    <dd>
                      {amount(conversion?.rawProfit)} <small>silver</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Chopping advantage vs raw sale</dt>
                    <dd
                      data-result="fish-chop-advantage"
                      className={
                        conversion?.advantage === null || conversion?.advantage === undefined
                          ? ""
                          : conversion.advantage >= 0
                            ? "positive"
                            : "negative"
                      }
                    >
                      {amount(conversion?.advantage)} <small>silver</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Upfront cash, including processing</dt>
                    <dd>
                      {amount(conversion?.upfront)} <small>silver</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Break-even chopped sale price</dt>
                    <dd>
                      {amount(conversion?.breakEven)} <small>silver / chopped fish</small>
                    </dd>
                  </div>
                </dl>
              )}
            </>
          ) : (
            <>
              <div className="fishing-result-heading">
                <Fish size={20} />
                <div>
                  <h3>Put your catch toward fishing fame.</h3>
                  <p>
                    Whole fish rounded up to meet your entered target. Learning Points and level
                    thresholds are excluded.
                  </p>
                </div>
              </div>
              <dl>
                <div>
                  <dt>Fish needed</dt>
                  <dd data-result="fishing-fish-needed">{amount(leveling?.needed)}</dd>
                </div>
                <div>
                  <dt>Purchase cost for your target</dt>
                  <dd data-result="fishing-target-cost">
                    {amount(leveling?.cost)} <small>silver</small>
                  </dd>
                </div>
                <div>
                  <dt>Silver per 1,000 fame</dt>
                  <dd>{amount(leveling?.silverPerThousand)}</dd>
                </div>
                <div>
                  <dt>Fame from those whole fish</dt>
                  <dd>{amount(leveling?.actualFame)}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
        <p className="fishing-source-note">
          Check yields and fame against your in-game setup. Prices: Albion Online Data Project, on
          request. Only recent matching-region/city observations enter results; manual overrides
          stay manual. Current game coefficients remain subject to in-game confirmation.
        </p>
      </div>
    </section>
  );
}
