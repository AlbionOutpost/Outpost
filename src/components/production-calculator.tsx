"use client";
import "@/app/production-workspace.css";
import { ProductionProfile } from "./production-profile";
import { ArrowRight, CircleCheck, Calculator } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAtlasRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
import { recipes, recipeFor, enchantable } from "@/lib/albion/recipes";
import {
  initialProduction,
  production,
  productionSchema,
  returnRateFromBonus,
  productionOutputQuality,
  estimatedFocusCost,
  type ProductionInput,
} from "@/lib/albion/production";
import { ItemIcon } from "./item-icon";
import { ScenarioControls } from "./scenario-controls";
import {
  productionPriceQuery,
  mergeProductionObservations,
} from "@/lib/albion/production-observations";
export function ProductionCalculator({ kind }: { kind: ProductionInput["kind"] }) {
  const region = useAtlasRegion();
  const router = useRouter();
  const [draft, setDraft] = useState(() => initialProduction(kind, region));
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [showScenarios, setShowScenarios] = useState(false);
  const [attemptedKey, setAttemptedKey] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [bonus, setBonus] = useState(0);
  const [efficiency, setEfficiency] = useState(0);
  const configuration = { ...draft, region };
  const outputQuality = productionOutputQuality(configuration);
  const requestKey = productionPriceQuery(configuration);
  const busy = pendingKey === requestKey;
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [requestKey],
  );
  const recipe = recipeFor(configuration);
  let result: ReturnType<typeof production> | null = null;
  let validation = "";
  try {
    result = production(configuration);
  } catch (e) {
    validation =
      e instanceof Error && e.message.startsWith("Scenario")
        ? e.message
        : "Check quantities, percentages, enchantment path and focus cost.";
  }
  function update<K extends keyof ProductionInput>(key: K, value: ProductionInput[K]) {
    setDraft((d) => ({
      ...d,
      [key]: value,
      ...(d.mechanicsProfile &&
      ["recipeId", "returnRate", "focusReturnRate", "returns"].includes(key)
        ? {
            mechanicsProfile: null,
            ...(key === "recipeId" ? { returnRate: 0, focusReturnRate: 0, returns: {} } : {}),
          }
        : {}),
    }));
  }
  function price(id: string, quality: number, value: string) {
    setDraft((d) => ({
      ...d,
      prices: {
        ...d.prices,
        [id]: {
          value: value === "" ? null : Number(value),
          manual: true,
          observedAt: null,
          region: null,
          city: null,
          quality,
        },
      },
    }));
  }
  async function load() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const requested = configuration;
    setPendingKey(requestKey);
    setAttemptedKey(requestKey);
    setError("");
    try {
      const response = await fetch(`/api/economy/prices?${requestKey}`, {
        signal: controller.signal,
      });
      const body = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(body.error);
      const observedPrices = productionSchema.shape.prices.parse(body.prices);
      setDraft((d) =>
        mergeProductionObservations({ ...d, region }, requested, observedPrices, overwrite),
      );
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Market observations unavailable");
    } finally {
      if (request.current === controller) setPendingKey(null);
    }
  }
  const money = (v: number | null | undefined) =>
    v === null || v === undefined
      ? "Unavailable"
      : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const current = (id: string, quality: number, city = draft.materialCity) => {
    const p = draft.prices[id];
    return p &&
      (p.manual || p.value !== 0) &&
      p.quality === quality &&
      (p.manual || (p.region === region && p.city === city))
      ? p
      : null;
  };
  const hasPrices = Object.values(draft.prices).some((p) => p.value !== null);
  const attempted = attemptedKey === requestKey;
  function goToStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => {
      const panel = document.getElementById(
        next === 1
          ? "production-setup"
          : next === 2
            ? "production-materials"
            : "production-results",
      );
      panel?.focus({ preventScroll: true });
      if (matchMedia("(max-width: 780px)").matches) panel?.scrollIntoView({ block: "start" });
    });
  }
  return (
    <div className="production-journey" data-step={step}>
      <nav className="production-mode-nav" aria-label="Production calculators">
        {(["crafting", "refining", "enchanting"] as const).map((mode) => (
          <Link
            key={mode}
            href={`/tools/${mode}?region=${region}`}
            aria-current={kind === mode ? "page" : undefined}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Link>
        ))}
      </nav>
      <nav className="task-progress production-steps" aria-label="Crafting workflow">
        {[
          [1, "Choose recipe"],
          [2, "Price materials"],
          [3, "Review profit"],
        ].map(([n, label]) => (
          <button
            type="button"
            key={n}
            aria-current={step === n ? "step" : undefined}
            onClick={() => goToStep(Number(n))}
          >
            <span>{n}</span>
            {label}
          </button>
        ))}
      </nav>
      <div className="calculator-grid production-workspace">
        <div className="calculator-inputs">
          <section className="panel" id="production-setup" tabIndex={-1}>
            <h2 className="production-inputs-heading">
              <ItemIcon id={recipe.output} quality={outputQuality} size={36} />
              Choose your recipe
            </h2>
            {kind !== "enchanting" ? (
              <label>
                Recipe
                <select
                  aria-label="Production recipe"
                  value={draft.recipeId}
                  onChange={(e) => update("recipeId", e.target.value)}
                >
                  {recipes
                    .filter((r) => r.kind === kind)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <div className="input-grid">
                <label>
                  Equipment family
                  <select
                    aria-label="Enchantment equipment"
                    value={draft.enchantFamily}
                    onChange={(e) => update("enchantFamily", e.target.value)}
                  >
                    {enchantable.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tier
                  <select
                    aria-label="Enchantment tier"
                    value={draft.tier}
                    onChange={(e) => update("tier", Number(e.target.value))}
                  >
                    {[4, 5, 6, 7, 8].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  From enchantment
                  <select
                    aria-label="From enchantment"
                    value={draft.fromEnchant}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        fromEnchant: Number(e.target.value),
                        toEnchant: Math.max(draft.toEnchant, Number(e.target.value) + 1),
                      })
                    }
                  >
                    {[0, 1, 2].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  To enchantment
                  <select
                    aria-label="To enchantment"
                    value={draft.toEnchant}
                    onChange={(e) => update("toEnchant", Number(e.target.value))}
                  >
                    {[1, 2, 3]
                      .filter((t) => t > draft.fromEnchant)
                      .map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                  </select>
                </label>
              </div>
            )}
            <div className="input-grid">
              <label>
                Crafts / upgrades
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={draft.batches}
                  onChange={(e) => update("batches", Number(e.target.value))}
                />
              </label>
              <label>
                Output quality assumption
                <select
                  aria-label="Output quality assumption"
                  value={outputQuality}
                  disabled={kind === "refining"}
                  onChange={(e) => update("quality", Number(e.target.value))}
                >
                  {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"].map((q, i) => (
                    <option key={q} value={i + 1}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="production-batch-actions" aria-label="Batch quantity shortcuts">
              {[1, 10, 100].map((n) => (
                <button
                  type="button"
                  key={n}
                  aria-label={`Set ${n} batches`}
                  aria-pressed={draft.batches === n}
                  onClick={() => update("batches", n)}
                >
                  {n.toLocaleString()}×
                </button>
              ))}
            </div>
            <div className="input-grid production-city-choices">
              {" "}
              <label>
                Material purchase market
                <select
                  aria-label="Material purchase market"
                  value={draft.materialCity}
                  onChange={(e) =>
                    update("materialCity", e.target.value as ProductionInput["materialCity"])
                  }
                >
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Output sale market
                <select
                  aria-label="Output sale market"
                  value={draft.outputCity}
                  onChange={(e) =>
                    update("outputCity", e.target.value as ProductionInput["outputCity"])
                  }
                >
                  {cities.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className="button primary production-next"
              type="button"
              onClick={() => goToStep(2)}
            >
              Next: price materials <ArrowRight size={16} aria-hidden="true" />
            </button>
            <details className="production-fees">
              <summary>Markets & transaction fees</summary>
              <div className="input-grid">
                <label>
                  Station / upgrade fee per craft
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={draft.stationFee}
                    onChange={(e) => update("stationFee", Number(e.target.value))}
                  />
                </label>
                <label>
                  Sales tax (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={draft.tax}
                    onChange={(e) => update("tax", Number(e.target.value))}
                  />
                </label>
                <label>
                  Sell order setup fee (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={draft.setupFee}
                    onChange={(e) => update("setupFee", Number(e.target.value))}
                  />
                </label>
              </div>
            </details>
            {kind !== "enchanting" && (
              <details className="production-returns" open={draft.returnRate > 0 || draft.useFocus}>
                <summary>Returns & focus</summary>
                <p className="muted">
                  Enter the return rates and focus cost shown by your station. Select eligible
                  ingredients below. Retained resources are valued at purchase cost; per-craft
                  rounding is outside this estimate.
                </p>
                <div className="input-grid">
                  <label>
                    Return rate without focus (%)
                    <input
                      type="number"
                      min={0}
                      max={99.9}
                      step="any"
                      value={draft.returnRate}
                      onChange={(e) => update("returnRate", Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Use focus assumptions
                    <select
                      aria-label="Use focus assumptions"
                      value={draft.useFocus ? "yes" : "no"}
                      onChange={(e) => update("useFocus", e.target.value === "yes")}
                    >
                      <option value="no">No focus</option>
                      <option value="yes">Use entered focus values</option>
                    </select>
                  </label>
                  {draft.useFocus && (
                    <>
                      <label>
                        Return rate with focus (%)
                        <input
                          type="number"
                          min={0}
                          max={99.9}
                          step="any"
                          value={draft.focusReturnRate}
                          onChange={(e) => update("focusReturnRate", Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Total focus used
                        <input
                          type="number"
                          min={1}
                          value={draft.focusUsed}
                          onChange={(e) => update("focusUsed", Number(e.target.value))}
                        />
                      </label>
                    </>
                  )}
                </div>
                {draft.useFocus && recipe.baseFocus !== undefined && (
                  <details>
                    <summary>Estimate focus from total efficiency</summary>
                    <p className="muted">
                      July source base cost: {recipe.baseFocus} focus per craft. Enter your total
                      focus cost efficiency from the Destiny Board, including specialization. This
                      historical model does not verify current coefficients or station rounding;
                      confirm the total at your station before entering it above.
                    </p>
                    <label>
                      Total focus cost efficiency
                      <input
                        type="number"
                        min={0}
                        max={100000}
                        value={efficiency}
                        onChange={(e) => setEfficiency(Number(e.target.value))}
                      />
                    </label>
                    <p>
                      Estimated total focus:{" "}
                      {efficiency >= 0 &&
                      efficiency <= 100000 &&
                      Number.isInteger(draft.batches) &&
                      draft.batches > 0 &&
                      draft.batches <= 100000
                        ? money(estimatedFocusCost(recipe.baseFocus, efficiency, draft.batches))
                        : "Invalid inputs"}
                    </p>
                    <a
                      className="text-link"
                      href="https://forum.albiononline.com/index.php/Thread/167434-Explaining-Crafting-Tax-and-more/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Historical focus formula and limitations
                    </a>
                  </details>
                )}
                <details>
                  <summary>Convert a station production bonus to return rate</summary>
                  <label>
                    Production bonus (%)
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={bonus}
                      onChange={(e) => setBonus(Number(e.target.value))}
                    />
                  </label>
                  <p>
                    {bonus >= 0 && bonus <= 1000
                      ? (returnRateFromBonus(bonus) * 100).toFixed(3)
                      : "Invalid"}
                    % = 100 × (1 − 1 / (1 + bonus / 100)). Apply this rate manually above after
                    verifying your station.
                  </p>
                </details>
              </details>
            )}
            <p className="production-coverage">
              {kind === "crafting"
                ? "45 crafting recipes, T4–T8 · archived sources, current patch unverified."
                : kind === "refining"
                  ? "25 refining recipes, T4–T8 · archived sources, current patch unverified."
                  : "Rune enchanting for the original supported equipment families."}{" "}
              Enter your own station and market assumptions.
            </p>
            {kind !== "enchanting" && (
              <ProductionProfile
                kind={kind}
                output={recipe.output}
                baseFocus={recipe.baseFocus}
                batches={draft.batches}
                saved={draft.mechanicsProfile}
                onApply={(profile, rates) =>
                  setDraft((d) => ({
                    ...d,
                    mechanicsProfile: profile,
                    returnRate: rates.returnRate,
                    focusReturnRate: rates.focusReturnRate,
                    returns: Object.fromEntries(recipe.ingredients.map((i) => [i.id, true])),
                  }))
                }
              />
            )}
            <details className="production-model-notes">
              <summary>Model notes & recipe source</summary>{" "}
              <p className="muted">
                Tax/fees and output quality are assumptions, not verified current game defaults or
                random-quality probabilities. Crafting/refining currently cover a small factual
                recipe subset.
              </p>
              <a className="text-link" href={recipe.source} target="_blank" rel="noreferrer">
                Recipe source
              </a>
            </details>
          </section>
        </div>
        <section
          className="panel section production-materials"
          id="production-materials"
          tabIndex={-1}
        >
          <div className="section-heading">
            <h2>Material costs</h2>
            <button className="button secondary" disabled={busy} onClick={load}>
              {busy ? "Fetching observations…" : "Load market observations"}
            </button>
          </div>
          <p className="production-price-help">
            Load observed prices for {draft.materialCity}, or enter your own prices below. Output
            sells in {draft.outputCity}.
          </p>
          {attempted && !busy && !error && !result?.complete && (
            <p className="task-state" role="status">
              Some prices were not observed for this recipe, market or quality. Enter the missing
              unit prices to finish. Existing observations keep their source times.
            </p>
          )}
          <label>
            Replace manual overrides when refreshing
            <select
              aria-label="Replace manual overrides"
              value={overwrite ? "yes" : "no"}
              onChange={(e) => setOverwrite(e.target.value === "yes")}
            >
              <option value="no">Keep manual prices</option>
              <option value="yes">Replace all from source</option>
            </select>
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="production-price-list">
            {recipe.ingredients.map((i) => {
              const q = i.quality === "selected" ? draft.quality : 1;
              const p = current(i.id, q);
              return (
                <section className="material-price-row" key={i.id}>
                  <div className="material-item-heading">
                    <ItemIcon id={i.id} size={42} />
                    <strong>{i.name}</strong>
                    <span
                      className="numeric"
                      title={`${i.quantity} per craft · ${i.quantity * draft.batches} required upfront · ${i.id}`}
                    >
                      ×{i.quantity * draft.batches}
                    </span>
                  </div>
                  <div className="material-pricing-controls">
                    <label>
                      <span>Unit price</span>
                      <input
                        aria-label={`${i.name} unit price`}
                        type="number"
                        min={0}
                        step="any"
                        placeholder="Enter price"
                        value={p?.value ?? ""}
                        onChange={(e) => price(i.id, q, e.target.value)}
                      />
                    </label>

                    {kind !== "enchanting" && (
                      <label className="material-return-choice">
                        <input
                          type="checkbox"
                          aria-label={`Apply returns to ${i.name}`}
                          checked={!!draft.returns[i.id]}
                          onChange={(e) =>
                            update("returns", { ...draft.returns, [i.id]: e.target.checked })
                          }
                        />
                        Apply returns
                      </label>
                    )}
                  </div>
                  <div className="material-row-cost">
                    <span className="muted" title={p?.observedAt || i.id}>
                      {p?.manual
                        ? "Manual override"
                        : p?.observedAt
                          ? `${p.observedAt} UTC`
                          : attempted
                            ? "No source observation"
                            : "Enter or load a price"}
                    </span>
                    <span>
                      Cost{" "}
                      <strong className="numeric">
                        {money(result?.rows.find((row) => row.id === i.id)?.gross).replace(
                          "Unavailable",
                          "pending",
                        )}
                      </strong>
                    </span>
                  </div>
                </section>
              );
            })}
            <section className="production-output-price">
              <div className="material-item-heading">
                <ItemIcon id={recipe.output} quality={outputQuality} size={42} />
                <strong>Output sale price</strong>
                <span className="numeric">×{recipe.outputCount * draft.batches}</span>
              </div>
              <label>
                Unit sale price
                <input
                  aria-label="Output unit sale price"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Enter price"
                  value={current(recipe.output, outputQuality, draft.outputCity)?.value ?? ""}
                  onChange={(e) => price(recipe.output, outputQuality, e.target.value)}
                />
              </label>

              <small className="muted">
                {current(recipe.output, outputQuality, draft.outputCity)?.manual
                  ? "Manual override"
                  : current(recipe.output, outputQuality, draft.outputCity)?.observedAt ||
                    (attempted
                      ? "No output quote returned. Enter your sale price."
                      : "Enter your expected sale price, or load observations.")}
              </small>
            </section>
          </div>
          <button
            className="button primary production-next"
            type="button"
            onClick={() => goToStep(3)}
          >
            Review profit <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>
        <section className="panel result" id="production-results" tabIndex={-1}>
          <h2>Profit breakdown</h2>
          {!result?.complete ? (
            <div className="production-result-start" role="status">
              <Calculator size={32} aria-hidden="true" />
              <h3>
                {busy
                  ? "Loading observed prices…"
                  : error
                    ? "Prices could not be loaded"
                    : attempted || hasPrices
                      ? "Finish pricing your run"
                      : "What will this run earn?"}
              </h3>
              <p>
                {busy
                  ? "Checking material and output prices for your selected markets."
                  : error
                    ? "Your recipe and manual prices are kept. Retry loading observations or enter prices yourself."
                    : attempted || hasPrices
                      ? "Add the missing unit prices below. Profit appears when every required price is configured."
                      : "Choose your recipe and quantity, then load market observations or add unit prices. We’ll calculate the cost and profit here."}
              </p>
              <button className="button secondary" type="button" onClick={() => goToStep(2)}>
                Add material prices <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <strong
              key={result.profit}
              className={`value-update${(result.profit ?? 0) < 0 ? " negative" : ""}`}
            >
              {money(result.profit)}
              <small> silver</small>
            </strong>
          )}
          {result?.stale && (
            <p className="error">
              Stale or undated source observations included. Refresh before acting.
            </p>
          )}
          {validation && (
            <p role="alert" className="error">
              {validation}
            </p>
          )}
          {result && !result.complete && (attempted || hasPrices) && (
            <p role="status">
              Missing or mismatched observations:{" "}
              {result.missing
                .map((id) =>
                  id === recipe.output
                    ? recipe.name
                    : recipe.ingredients.find((i) => i.id === id)?.name || id,
                )
                .join(", ")}
              . No complete profit estimate is available.
            </p>
          )}
          {result?.complete && (
            <dl>
              {[
                ["Total material cost", result?.grossMaterials],
                ["Station / upgrade fees", result?.stationCost],
                ["Upfront silver requirement", result?.upfront],
                ["Expected returned material value", result?.returnCredit],
                ["Effective production cost", result?.cost],
                ["Gross output revenue", result?.revenue],
                ["Taxes and setup fees", result?.fees],
                ["Cash profit before valuing retained returns", result?.cashProfit],
                ["Profit margin (%)", result?.margin],
                ["ROI on effective cost (%)", result?.roi],
                ["Profit per output", result?.profitPerItem],
                ...(draft.useFocus
                  ? [
                      ["Profit per focus", result?.profitPerFocus],
                      ["Additional material value per focus", result?.incrementalPerFocus],
                    ]
                  : []),
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt>{label}</dt>
                  <dd>{money(value as number | null | undefined)}</dd>
                </div>
              ))}
            </dl>
          )}
          {result?.complete && (
            <p className="production-result-note">
              <CircleCheck size={16} aria-hidden="true" />
              Based on your prices and assumptions. Retained returns are valued separately from cash
              profit.
            </p>
          )}
        </section>
      </div>
      <button
        type="button"
        className="button secondary production-scenarios-toggle"
        aria-expanded={showScenarios}
        aria-controls="production-scenarios"
        onClick={() => setShowScenarios(!showScenarios)}
      >
        Saved runs & sharing
      </button>
      <div
        id="production-scenarios"
        className={`production-scenarios${showScenarios ? " is-open" : ""}`}
      >
        <ScenarioControls
          schema={productionSchema}
          configuration={configuration}
          onLoad={(value) => {
            if (value.kind === kind && productionSchema.safeParse(value).success) {
              request.current?.abort();
              setDraft(value);
              if (value.region !== region) {
                document.cookie = `atlas-region=${value.region}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
                const url = new URL(window.location.href);
                url.searchParams.set("region", value.region);
                router.replace(url.pathname + url.search + url.hash, { scroll: false });
              }
            }
          }}
        />
      </div>
    </div>
  );
}
