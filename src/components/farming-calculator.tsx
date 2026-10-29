"use client";
import { CalculationReadiness } from "./calculation-readiness";
import { useEffect, useRef, useState } from "react";
import { Sprout } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  crops,
  farming,
  farmingSchema,
  initialFarming,
  type FarmingInput,
} from "@/lib/albion/farming";
import { quoteResponse } from "@/lib/albion/market-quotes";
import { cities } from "@/lib/albion/region-config";
import { useAtlasRegion } from "./region-context";
import { ItemIcon } from "./item-icon";
import { ScenarioControls } from "./scenario-controls";
import "@/app/farming-workspace.css";
const money = (n: number | null | undefined) =>
  n === null || n === undefined
    ? "Not calculated"
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
export function FarmingCalculator() {
  const router = useRouter();
  const region = useAtlasRegion(),
    [draft, setDraft] = useState(() => initialFarming(region));
  const [query, setQuery] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const crop = crops.find((c) => c.productId === draft.cropId)!;
  const config = { ...draft, region };
  useEffect(
    () => () => controller.current?.abort(),
    [region, draft.cropId, draft.materialCity, draft.outputCity],
  );
  let result: ReturnType<typeof farming> | null = null;
  let error = "";
  try {
    result = farming(config);
  } catch (e) {
    error =
      e instanceof Error && e.message.startsWith("Farming totals")
        ? e.message
        : "Check planted and watered quantities, yield, fees and focus inputs.";
  }
  function update<K extends keyof FarmingInput>(key: K, value: FarmingInput[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  async function refresh() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const requested = config;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/market/batch?${new URLSearchParams({ region, items: [crop.seedId, crop.productId].join(","), quality: "1" })}`,
        { signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) },
      );
      if (!response.ok)
        throw new Error("Market observations unavailable. Existing inputs were kept.");
      const body = quoteResponse.parse(await response.json());
      if (request.signal.aborted) return;
      if (body.region !== requested.region)
        throw new Error("Price server mismatch. Existing inputs were kept.");
      setDraft((d) => {
        if (
          d.cropId !== requested.cropId ||
          d.materialCity !== requested.materialCity ||
          d.outputCity !== requested.outputCity
        )
          return d;
        const next = { ...d };
        for (const [key, id, city] of [
          ["seedPrice", crop.seedId, requested.materialCity],
          ["productPrice", crop.productId, requested.outputCity],
        ] as const) {
          if (d[key] !== requested[key] || (d[key].manual && d[key].value !== null)) continue;
          const row = body.prices.find(
            (p) => p.item_id === id && p.city === city && p.quality === 1,
          );
          next[key] = {
            itemId: id,
            value: row?.sell_price_min || null,
            manual: false,
            quality: 1,
            region: requested.region,
            city,
            observedAt: row?.sell_price_min ? row.sell_price_min_date : null,
          };
        }
        return next;
      });
      setMessage(
        "Sell-listing observations loaded. Manual prices kept. Missing observations remain unavailable.",
      );
    } catch (e) {
      if (!request.signal.aborted)
        setMessage(e instanceof Error ? e.message : "Price service unavailable");
    } finally {
      if (controller.current === request) setBusy(false);
    }
  }
  function priceField(key: "seedPrice" | "productPrice", label: string, city: string) {
    const p = config[key];
    const matches =
      p.quality === 1 &&
      (p.manual ||
        (p.region === region &&
          p.city === city &&
          p.itemId === (key === "seedPrice" ? crop.seedId : crop.productId)));
    return (
      <label>
        {label}
        <input
          aria-label={label}
          aria-describedby={`farming-${key}-source`}
          type="number"
          min={0}
          max={1e12}
          step="any"
          value={matches ? (p.value ?? "") : ""}
          placeholder="Enter or load a price"
          onChange={(e) =>
            update(key, {
              value: e.target.value === "" ? null : Number(e.target.value),
              manual: true,
              quality: 1,
              region: null,
              city: null,
              observedAt: null,
            })
          }
        />
        <small id={`farming-${key}-source`}>
          {!matches || p.value === null
            ? "No usable price"
            : p.manual
              ? "Manual input"
              : `Observed sell listing · ${p.observedAt || "unknown time"}`}
        </small>
      </label>
    );
  }
  return (
    <>
      <div className="farming-workspace">
        <aside className="panel farming-library">
          <h2>Crops & herbs</h2>
          <label>
            Find a crop
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Carrots, herbs…"
            />
          </label>
          <div className="farming-crop-list">
            {crops
              .filter((c) =>
                `${c.productName} ${c.type} T${c.tier}`.toLowerCase().includes(query.toLowerCase()),
              )
              .map((c) => (
                <button
                  key={c.productId}
                  type="button"
                  aria-pressed={c.productId === crop.productId}
                  onClick={() => {
                    controller.current?.abort();
                    setBusy(false);
                    setDraft((d) => ({
                      ...d,
                      cropId: c.productId,
                      seedYieldBase: c.seedYieldBase,
                      seedYieldWatered: c.seedYieldWatered,
                      seedPrice: initialFarming(region).seedPrice,
                      productPrice: initialFarming(region).productPrice,
                    }));
                    setMessage(
                      "Historical seed-return defaults loaded. Confirm them in game; harvest yield and other assumptions were kept.",
                    );
                  }}
                >
                  <ItemIcon id={c.productId} size={36} />
                  <span>
                    {c.productName}
                    <small>
                      T{c.tier} · {c.type}
                    </small>
                  </span>
                </button>
              ))}
          </div>
          {!crops.some((c) =>
            `${c.productName} ${c.type} T${c.tier}`.toLowerCase().includes(query.toLowerCase()),
          ) && <p>No matching crop. Try a name or tier.</p>}
        </aside>
        <div className="farming-inputs">
          <section className="panel">
            <div className="farming-identity">
              <ItemIcon id={crop.productId} size={64} />
              <div>
                <p className="eyebrow">Single-harvest plan</p>
                <h2>{crop.productName}</h2>
                <p>
                  T{crop.tier} · {crop.type} · {region}
                </p>
              </div>
            </div>
            <div className="input-grid">
              <label>
                Seeds to plant
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={draft.plants}
                  onChange={(e) => update("plants", Number(e.target.value))}
                />
              </label>
              <label>
                Plants to water
                <input
                  type="number"
                  min={0}
                  max={draft.plants}
                  value={draft.wateredPlants}
                  aria-invalid={draft.wateredPlants > draft.plants}
                  onChange={(e) => update("wateredPlants", Number(e.target.value))}
                />
              </label>
              <label>
                Harvest per plant
                <input
                  aria-label="Harvest per plant"
                  aria-describedby="farming-harvest-help"
                  type="number"
                  min={0}
                  max={1000}
                  step="any"
                  placeholder="Confirm your actual yield"
                  value={draft.harvestPerPlant ?? ""}
                  onChange={(e) =>
                    update("harvestPerPlant", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
                <small id="farming-harvest-help">
                  Expected produce, including your premium and local bonuses. Not a guaranteed
                  harvest.
                </small>
              </label>
              <label>
                Actual total watering focus
                <input
                  type="number"
                  min={0}
                  max={1e9}
                  value={draft.focus ?? ""}
                  placeholder="Optional for focus comparison"
                  onChange={(e) =>
                    update("focus", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </label>
            </div>
            {error && <p role="alert">{error}</p>}
          </section>
          <section className="panel">
            <div className="farming-section-heading">
              <h2>Markets & prices</h2>
              <button className="button secondary" disabled={busy} onClick={refresh}>
                {busy ? "Loading observations…" : "Load market observations"}
              </button>
            </div>
            <p>
              Observed sell listings are estimates of buying seeds and listing produce, not
              executable sale guarantees. Enter negotiated or buy-order prices manually.
            </p>
            <div className="input-grid">
              {(
                [
                  ["materialCity", "Buy seeds in"],
                  ["outputCity", "Sell produce in"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <select
                    value={draft[key]}
                    onChange={(e) => update(key, e.target.value as FarmingInput[typeof key])}
                  >
                    {cities
                      .filter((c) => c !== "Black Market" || draft[key] === c)
                      .map((c) => (
                        <option key={c} disabled={c === "Black Market"}>
                          {c}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
              {priceField("seedPrice", "Seed unit price · silver", draft.materialCity)}
              {priceField("productPrice", "Produce unit price · silver", draft.outputCity)}
            </div>
            <p role="status">{message}</p>
          </section>
          <section className="panel">
            <p className="economy-assumption-readout">
              Applied seed returns: {draft.seedYieldBase}% unwatered · {draft.seedYieldWatered}%
              watered. Purchase fee {draft.buyFee}% · sale fees {draft.sellFee}% · other costs{" "}
              {draft.operatingCost.toLocaleString()} silver.
            </p>
            <details className="economy-assumptions">
              <summary>Seed returns & fees</summary>
              <p>
                Seed-return assumptions are editable. Confirm the values for your crop and setup.
                They are historical assumptions, not current-patch certification. 200% means two
                expected seeds per plant.
              </p>
              <div className="input-grid">
                {(
                  [
                    ["seedYieldBase", "Unwatered seed yield (%)", 300],
                    ["seedYieldWatered", "Watered seed yield (%)", 300],
                    ["buyFee", "Seed purchase fee (%)", 100],
                    ["sellFee", "Produce sales tax + setup (%)", 100],
                    ["operatingCost", "Other costs per harvest · silver", 1e12],
                  ] as const
                ).map(([key, label, max]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      min={0}
                      max={max}
                      step="any"
                      value={draft[key]}
                      onChange={(e) => update(key, Number(e.target.value))}
                    />
                  </label>
                ))}
              </div>
            </details>
          </section>
        </div>
        <aside className="panel farming-results" aria-labelledby="farming-results-title">
          <Sprout aria-hidden="true" size={24} />
          <h2 id="farming-results-title">Harvest estimate</h2>
          <p className="farming-price-status">
            {!result?.complete
              ? "Enter harvest yield and both prices to calculate profit."
              : `${[draft.seedPrice, draft.productPrice].some((p) => p.manual) ? "Includes manual prices" : "Observed-price estimate"}${result.stale ? " · Stale observations" : ""}`}
          </p>
          {!result?.complete && (
            <CalculationReadiness
              title="Complete your harvest estimate"
              missing={[
                ...(draft.harvestPerPlant === null ? ["Harvest per plant"] : []),
                ...(draft.seedPrice.value === null ? ["Seed unit price"] : []),
                ...(draft.productPrice.value === null ? ["Produce unit price"] : []),
                ...(draft.harvestPerPlant !== null &&
                draft.seedPrice.value !== null &&
                draft.productPrice.value !== null
                  ? ["Valid crop, quantity and matching market prices"]
                  : []),
              ]}
            >
              Prices must match the selected crop and cities. Load observations or enter manual
              prices.
            </CalculationReadiness>
          )}
          <small>Economic profit · silver</small>
          <output className="farming-main-result" data-result="farm-profit">
            {money(result?.profit)}
          </output>
          <p>
            Includes the value of retained seeds. It is not all cash available after selling
            produce.
          </p>
          {result?.complete && (
            <dl>
              {(
                [
                  ["Upfront cash", result?.upfront],
                  ["Produce to harvest", result?.harvest],
                  ["Expected seeds returned", result?.expectedSeeds],
                  ["Produce sale value", result?.revenue],
                  ["Produce sale fees", result?.fees],
                  ["Retained seed credit", result?.seedCredit],
                  ["Cash profit before seed credit", result?.cashProfit],
                  ["Extra seed value from watering", result?.focusBenefit],
                  ["Incremental silver / focus", result?.incrementalPerFocus],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{money(value)}</dd>
                </div>
              ))}
            </dl>
          )}
          <details>
            <summary>How this is calculated</summary>
            <p>
              Harvest = plants × your yield. Expected seeds = unwatered plants × base seed yield +
              watered plants × watered seed yield. Percentages are divided by 100.
            </p>
            <p>
              Upfront cash = seed purchases + purchase fees + other costs. Cash profit = produce
              sales − sale fees − upfront cash. Economic profit adds returned seeds valued at the
              entered seed price. Incremental focus value measures only the extra seeds from
              watering.
            </p>
            <p>
              One harvest, expected fractional yields. Seed sale fees, byproducts, island
              construction, premium subscription cost, growth timing and guaranteed outcomes are
              excluded. Include relevant expenses under other costs.
            </p>
            <a href="https://albiononline.com/news/guide-farming" target="_blank" rel="noreferrer">
              Official farming workflow
            </a>
          </details>
        </aside>
      </div>
      <details className="panel economy-saved-scenarios">
        <summary>Saved harvest scenarios & sharing</summary>
        <ScenarioControls
          schema={farmingSchema}
          configuration={config}
          onLoad={(value) => {
            controller.current?.abort();
            setBusy(false);
            setDraft(value);
            if (value.region !== region) {
              document.cookie = `atlas-region=${value.region}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
              const url = new URL(window.location.href);
              url.searchParams.set("region", value.region);
              router.replace(url.pathname + url.search + url.hash, { scroll: false });
            }
          }}
        />
      </details>
    </>
  );
}
