"use client";
import { ProductionSensitivity } from "./production-sensitivity";
import { CalculationReadiness } from "./calculation-readiness";
import "@/app/production-workspace.css";
import { EditorDialog } from "./editor-dialog";
import { ProductionProfile } from "./production-profile";
import { ArrowRight, CircleCheck, Calculator } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/link";
import { useAtlasRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
import {
  recipes,
  recipeFor,
  enchantable,
  findRecipe,
  registerRecipes,
  type Recipe,
} from "@/lib/albion/recipes";
import {
  initialProduction,
  production,
  productionSchema,
  returnRateFromBonus,
  productionOutputQuality,
  type ProductionInput,
} from "@/lib/albion/production";
import { ItemIcon } from "./item-icon";
import { ScenarioControls } from "./scenario-controls";
import { ProductionPlan } from "./production-plan";
import {
  productionPriceQuery,
  mergeProductionObservations,
} from "@/lib/albion/production-observations";
export function ProductionCalculator({
  kind,
  category,
  initialRecipeId,
}: {
  kind: ProductionInput["kind"];
  category?: "cooking" | "alchemy";
  initialRecipeId?: string;
}) {
  const region = useAtlasRegion();
  const router = useRouter();
  const [draft, setDraft] = useState(() => ({
    ...initialProduction(kind, region),
    ...(category ? { recipeId: recipes.find((r) => r.category === category)!.id } : {}),
    ...(initialRecipeId && kind !== "enchanting" ? { recipeId: initialRecipeId } : {}),
  }));
  const [error, setError] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [searchTier, setSearchTier] = useState(4);
  const [searchResults, setSearchResults] = useState<{ total: number; recipes: Recipe[] } | null>(
    null,
  );
  const [searchError, setSearchError] = useState("");
  const [, setRecipeVersion] = useState(0);
  const recipeKnown = kind === "enchanting" || !!findRecipe(draft.recipeId);
  const [recipeMissing, setRecipeMissing] = useState(false);
  // Saved scenarios and links can name any recipe in the game data; fetch it on demand.
  useEffect(() => {
    if (recipeKnown) return;
    const controller = new AbortController();
    fetch(`/api/recipes/${encodeURIComponent(draft.recipeId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("missing");
        const body = (await response.json()) as { recipe: Recipe; alternatives: Recipe[] };
        registerRecipes([body.recipe, ...body.alternatives]);
        setRecipeVersion((v) => v + 1);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRecipeMissing(true);
      });
    return () => controller.abort();
  }, [recipeKnown, draft.recipeId]);
  useEffect(() => {
    if (kind === "enchanting") return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const query = new URLSearchParams({
        kind,
        category: category ?? "equipment",
        limit: "60",
        ...(recipeSearch.trim().length >= 2
          ? { q: recipeSearch.trim() }
          : { tier: String(searchTier) }),
      });
      fetch(`/api/recipes?${query}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("Recipe search is unavailable");
          const body = (await response.json()) as { total: number; recipes: Recipe[] };
          registerRecipes(body.recipes);
          setSearchResults(body);
          setSearchError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setSearchError(e instanceof Error ? e.message : "Recipe search is unavailable");
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, category, recipeSearch, searchTier]);
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const modeNavigation = useRef<HTMLElement>(null);
  useEffect(() => {
    function revealCurrentMode() {
      const navigation = modeNavigation.current;
      const active = navigation?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!navigation || !active || navigation.scrollWidth <= navigation.clientWidth) return;
      const rail = navigation.getBoundingClientRect();
      const tab = active.getBoundingClientRect();
      if (tab.right > rail.right) navigation.scrollLeft += tab.right - rail.right + 12;
      else if (tab.left < rail.left) navigation.scrollLeft -= rail.left - tab.left + 12;
    }
    const frame = requestAnimationFrame(revealCurrentMode);
    window.addEventListener("resize", revealCurrentMode);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", revealCurrentMode);
    };
  }, [category, kind]);
  const [step, setStep] = useState(1);
  const [showScenarios, setShowScenarios] = useState(false);
  const [attemptedKey, setAttemptedKey] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [bonus, setBonus] = useState(0);
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
  if (!recipeKnown)
    return (
      <div className="production-journey premium-production">
        <section className="panel" role="status">
          {recipeMissing ? (
            <>
              <h2>Recipe not found</h2>
              <p className="muted">
                This link or saved scenario names a recipe that is not in the game data.
              </p>
              <Link className="button secondary" href={`/tools/${category || kind}`}>
                Start with the default recipe
              </Link>
            </>
          ) : (
            <p>Loading recipe…</p>
          )}
        </section>
      </div>
    );
  const recipe = recipeFor(configuration);
  const enchantFamily = enchantable.find((f) => f.code === draft.enchantFamily);
  const browseRecipes =
    searchResults?.recipes ??
    recipes.filter((r) => r.kind === kind && (!category || r.category === category));
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
  const missingPrices =
    result?.missing.map((id) =>
      id === recipe.output
        ? `${recipe.name} sale price`
        : `${recipe.ingredients.find((i) => i.id === id)?.name || id} unit price`,
    ) || [];
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
  const recipeBrowser = (
    <aside className="production-recipe-browser" aria-label="Recipe browser">
      <div className="recipe-browser-title">
        <h2>{kind === "enchanting" ? "Equipment" : "Recipe library"}</h2>
        <span>
          {kind === "enchanting"
            ? enchantable.length
            : (searchResults?.total ?? browseRecipes.length).toLocaleString()}
        </span>
      </div>
      <label className="recipe-browser-search">
        {kind === "enchanting" ? "Find equipment" : "Find a recipe"}
        <input
          type="search"
          aria-label="Search crafting recipes"
          placeholder="Search by item name…"
          value={recipeSearch}
          onChange={(e) => setRecipeSearch(e.target.value)}
        />
      </label>
      {kind !== "enchanting" && (
        <>
          <div className="recipe-tier-options" role="group" aria-label="Recipe tier">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((tier) => (
              <button
                type="button"
                key={tier}
                aria-label={`Browse T${tier} recipes`}
                aria-pressed={!recipeSearch && searchTier === tier}
                onClick={() => {
                  setRecipeSearch("");
                  setSearchTier(tier);
                }}
              >
                T{tier}
              </button>
            ))}
          </div>
          <div className="recipe-browser-list">
            {browseRecipes.map((r) => (
              <button
                type="button"
                key={r.id}
                aria-pressed={r.id === draft.recipeId}
                onClick={() => {
                  update("recipeId", r.id);
                  setRecipePickerOpen(false);
                }}
              >
                <ItemIcon id={r.output} size={38} />
                <span>
                  <strong>{r.name.replace(/ · T\d\.\d.*$/, "").replace(/^T\d /, "")}</strong>
                  <small>
                    T{r.tier ?? r.output.match(/^T(\d)/)?.[1]}.{r.enchantment ?? 0}
                    {r.alternative && r.alternative > 1 ? ` · option ${r.alternative}` : ""} ·{" "}
                    {r.ingredients.length} materials
                  </small>
                </span>
                {r.id === draft.recipeId && <CircleCheck size={15} aria-hidden="true" />}
              </button>
            ))}
            {searchResults && !searchResults.recipes.length && (
              <p role="status">No recipe matches. Try another item name.</p>
            )}
            {searchError && <p role="alert">{searchError}</p>}
            {searchResults && searchResults.total > searchResults.recipes.length && (
              <p className="muted">
                Showing {searchResults.recipes.length} of {searchResults.total.toLocaleString()}.
                Search to narrow the list.
              </p>
            )}
          </div>
        </>
      )}
      {kind === "enchanting" && (
        <div className="recipe-browser-list">
          {enchantable
            .filter((f) => f.name.toLowerCase().includes(recipeSearch.toLowerCase()))
            .map((f) => (
              <button
                type="button"
                key={f.code}
                aria-pressed={draft.enchantFamily === f.code}
                onClick={() => {
                  update("enchantFamily", f.code);
                  setRecipePickerOpen(false);
                }}
              >
                <span>
                  <strong>{f.name}</strong>
                  <small>{f.slot}</small>
                </span>
              </button>
            ))}
        </div>
      )}
      <p className="recipe-browser-footnote">
        Every crafting, refining, cooking and alchemy recipe in the game data (captured 27 Oct
        2026), including enchanted and artifact versions.
      </p>
    </aside>
  );
  return (
    <div className="production-journey premium-production" data-step={step}>
      <nav ref={modeNavigation} className="production-mode-nav" aria-label="Production calculators">
        {(["crafting", "refining", "enchanting", "cooking", "alchemy"] as const).map((mode) => (
          <Link
            key={mode}
            href={`/tools/${mode}?region=${region}`}
            aria-current={(category || kind) === mode ? "page" : undefined}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Link>
        ))}
        <a className="production-plan-jump" href="#production-plan-title">
          Production plan ↓
        </a>
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
      <div className={`calculator-grid production-workspace production-${kind}`}>
        {recipePickerOpen ? (
          <EditorDialog
            open
            title="Choose recipe"
            drawer
            onClose={() => setRecipePickerOpen(false)}
          >
            {recipeBrowser}
          </EditorDialog>
        ) : (
          <div className="production-desktop-browser">{recipeBrowser}</div>
        )}

        <div className="calculator-inputs">
          <h2 className="production-configuration-title">
            <span className="workspace-step" aria-hidden="true">
              1
            </span>
            Configuration
          </h2>
          <section className="panel" id="production-setup" tabIndex={-1}>
            <h2 className="production-inputs-heading">
              <span className="workspace-step" aria-hidden="true">
                1
              </span>
              Selected recipe
            </h2>
            {kind === "enchanting" && (
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
                    {(enchantFamily?.tiers ?? [4, 5, 6, 7, 8]).map((t) => (
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
            <div className="reference-recipe-identity">
              <ItemIcon id={recipe.output} quality={outputQuality} size={80} />
              <div>
                <h3>{recipe.name}</h3>
                <p>
                  {category === "cooking"
                    ? "Cooking recipe"
                    : category === "alchemy"
                      ? "Alchemy recipe"
                      : kind === "crafting"
                        ? "Crafting recipe"
                        : kind === "refining"
                          ? "Refining recipe"
                          : "Enchantment upgrade"}{" "}
                  · {recipe.outputCount} output per craft
                </p>
                <small className={recipe.historical ? "recipe-historical-status" : undefined}>
                  {recipe.historical
                    ? "Historical recipe · Confirm ingredients and station settings in game."
                    : "Check the recipe and your station settings in game."}
                </small>
              </div>
            </div>
            <button
              type="button"
              className="button secondary production-change-recipe"
              onClick={() => setRecipePickerOpen(true)}
            >
              Change recipe
            </button>
          </section>
          <section className="panel reference-assumptions">
            <h2>
              <span className="workspace-step" aria-hidden="true">
                2
              </span>
              City & assumptions
            </h2>
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
                  {cities
                    .filter((c) => c !== "Black Market" || draft.materialCity === c)
                    .map((c) => (
                      <option key={c} disabled={c === "Black Market"}>
                        {c}
                      </option>
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
            <details className="reference-advanced-assumptions">
              <summary>Station settings, focus & sources</summary>
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
                <details
                  className="production-returns"
                  open={draft.returnRate > 0 || draft.useFocus}
                >
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
                {kind === "enchanting"
                  ? `Rune, soul and relic upgrades for ${enchantable.length} item families, .0 to .3.`
                  : "Recipes from game item data captured 27 Oct 2026, with every alternative."}{" "}
                Confirm quantities after a patch and enter your own station and market assumptions.
              </p>
              {kind !== "enchanting" && (
                <ProductionProfile
                  kind={kind}
                  output={recipe.output}
                  recipeId={recipe.id}
                  onFocus={(total) =>
                    setDraft((d) => ({ ...d, useFocus: true, focusUsed: Math.max(1, total) }))
                  }
                  baseFocus={recipe.baseFocus}
                  batches={draft.batches}
                  saved={draft.mechanicsProfile}
                  onApply={(profile, rates) =>
                    setDraft((d) => ({
                      ...d,
                      mechanicsProfile: profile,
                      returnRate: rates.returnRate,
                      focusReturnRate: rates.focusReturnRate,
                      returns: Object.fromEntries(
                        recipe.ingredients.map((i) => [i.id, i.returnable !== false]),
                      ),
                    }))
                  }
                />
              )}
              <details className="production-model-notes">
                <summary>Model notes & recipe source</summary>{" "}
                <p className="muted">
                  Tax/fees and output quality are assumptions, not verified current game defaults or
                  random-quality probabilities.
                </p>
                {recipe.source.startsWith("https://") &&
                !/albiononlinegrind|albionutil/i.test(recipe.source) ? (
                  <a className="text-link" href={recipe.source} target="_blank" rel="noreferrer">
                    Recipe reference
                  </a>
                ) : (
                  <p className="muted">
                    Recipe source:{" "}
                    {recipe.source.startsWith("https://") ? "archived game data" : recipe.source}.{" "}
                    <Link className="text-link" href="/guides">
                      Recipe & planning guides →
                    </Link>
                  </p>
                )}
              </details>
            </details>
          </section>
          <section className="panel reference-quantity">
            <h2>
              <span className="workspace-step" aria-hidden="true">
                3
              </span>
              Quantity & quality
            </h2>
            <p className="muted">
              Set the size of your run. Focus and return assumptions are available in the adjacent
              settings.
            </p>{" "}
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
                  disabled={kind === "refining" || !!recipe.category}
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
            <button
              className="button primary production-next"
              type="button"
              onClick={() => goToStep(2)}
            >
              Next: price materials <ArrowRight size={16} aria-hidden="true" />
            </button>
          </section>
        </div>
        <section
          className="panel section production-materials"
          id="production-materials"
          tabIndex={-1}
        >
          <div className="section-heading">
            <h2>
              <span className="workspace-step" aria-hidden="true">
                2
              </span>
              Material costs
            </h2>
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
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Material requirements and pricing"
            >
              <table className="reference-material-table">
                <thead>
                  <tr>
                    <th scope="col">Resource</th>
                    <th scope="col" className="numeric">
                      <abbr title="Recipe quantity before returned materials">Gross qty</abbr>
                    </th>
                    <th scope="col">Unit price · silver</th>
                    <th scope="col" className="numeric">
                      Total · silver
                    </th>
                    <th scope="col">Price source / returns</th>
                  </tr>
                </thead>
                <tbody>
                  {recipe.ingredients.map((i) => {
                    const q = i.quality === "selected" ? draft.quality : 1;
                    const p = current(i.id, q);
                    return (
                      <tr key={i.id}>
                        <th scope="row">
                          <span className="material-item-heading">
                            <ItemIcon id={i.id} size={36} />
                            <strong>{i.name}</strong>
                            <small className="material-row-total">
                              Total: {money(result?.rows.find((row) => row.id === i.id)?.gross)}{" "}
                              silver
                            </small>
                          </span>
                        </th>
                        <td className="numeric" title={`${i.quantity} per craft`}>
                          {i.quantity * draft.batches}
                        </td>
                        <td>
                          <input
                            aria-label={`${i.name} unit price`}
                            type="number"
                            min={0}
                            step="any"
                            placeholder="Enter price"
                            value={p?.value ?? ""}
                            onChange={(e) => price(i.id, q, e.target.value)}
                          />
                        </td>
                        <td className="numeric">
                          {money(result?.rows.find((row) => row.id === i.id)?.gross).replace(
                            "Unavailable",
                            "pending",
                          )}
                        </td>
                        <td>
                          <small className="muted" title={p?.observedAt || i.id}>
                            {p?.manual
                              ? "Manual override"
                              : p?.observedAt
                                ? `${p.observedAt} UTC`
                                : attempted
                                  ? "No source observation"
                                  : "Enter or load a price"}
                          </small>
                          {kind !== "enchanting" && (
                            <label className="material-return-choice">
                              <input
                                type="checkbox"
                                aria-label={`Apply returns to ${i.name}`}
                                disabled={i.returnable === false}
                                checked={!!draft.returns[i.id] && i.returnable !== false}
                                onChange={(e) =>
                                  update("returns", { ...draft.returns, [i.id]: e.target.checked })
                                }
                              />
                              {i.returnable === false ? "Never returned" : "Apply returns"}
                            </label>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
          <div className="production-result-item">
            <ItemIcon id={recipe.output} quality={outputQuality} size={56} />
            <div>
              <h2>
                <span className="workspace-step" aria-hidden="true">
                  3
                </span>
                Results summary
              </h2>
              <span>
                {recipe.name} · {recipe.outputCount * draft.batches} output
                {recipe.outputCount * draft.batches === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <p className="muted">
            Estimated costs and profit in silver, based on your selected prices and assumptions.
          </p>
          {!result?.complete ? (
            <div className="production-result-start" role="status">
              <Calculator size={32} aria-hidden="true" />
              <h3>
                {busy
                  ? "Loading observed prices…"
                  : error
                    ? "Prices could not be loaded"
                    : attempted
                      ? "Finish pricing your run"
                      : "Price this run to see your profit"}
              </h3>
              <p>
                {busy
                  ? "Checking material and output prices for your selected markets."
                  : error
                    ? "Your recipe and manual prices are kept. Retry loading observations or enter prices yourself."
                    : `${recipe.name} is selected. Add the required material and output prices, or load observations for your selected cities.`}
              </p>
              <button className="button secondary" type="button" onClick={() => goToStep(2)}>
                Add material prices <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}
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
          {result && !result.complete && (
            <CalculationReadiness
              title={`${missingPrices.length} required prices remaining`}
              missing={missingPrices}
            >
              Profit stays unavailable until every required price matches this run.
            </CalculationReadiness>
          )}
          {result?.complete && (
            <>
              <div className="reference-result-cards">
                <div
                  className={
                    result.profitPerItem === 0
                      ? "neutral"
                      : (result.profitPerItem ?? 0) < 0
                        ? "negative"
                        : "positive"
                  }
                >
                  <span>Profit per output</span>
                  <strong>{money(result.profitPerItem)}</strong>
                  <small>silver / item</small>
                </div>
                <div
                  className={
                    result.profit === 0
                      ? "neutral"
                      : (result.profit ?? 0) < 0
                        ? "negative"
                        : "positive"
                  }
                >
                  <span>Total profit</span>
                  <output aria-label="Estimated total profit" data-result="total-profit">
                    {money(result.profit)}
                  </output>
                  <small>silver / run</small>
                </div>
                <div>
                  <span>Cost per output</span>
                  <strong>
                    {money(
                      result.cost === null
                        ? null
                        : result.cost / (recipe.outputCount * draft.batches),
                    )}
                  </strong>
                  <small>silver / item</small>
                </div>
                <div
                  className={
                    !result.margin ? "neutral" : result.margin < 0 ? "negative" : "positive"
                  }
                >
                  <span>Profit margin</span>
                  <strong>
                    {result.margin === null ? "Unavailable" : `${money(result.margin)}%`}
                  </strong>
                  <small>of gross revenue</small>
                </div>
              </div>
              <p className="muted">
                {Object.values(draft.prices).some((p) => p.manual)
                  ? "Includes manual prices. "
                  : "Source observations with recorded timestamps. "}
                Station fees, returns and taxes use your assumptions.
              </p>
            </>
          )}
          {result?.complete && (
            <dl className="production-cash-summary">
              <div>
                <dt>Upfront silver</dt>
                <dd>{money(result.upfront)}</dd>
              </div>
              <div>
                <dt>Net cash profit</dt>
                <dd>{money(result.cashProfit)}</dd>
              </div>
              <div>
                <dt>Retained return value</dt>
                <dd>{money(result.returnCredit)}</dd>
              </div>
              {draft.useFocus && (
                <div>
                  <dt>Profit / focus</dt>
                  <dd>{money(result.profitPerFocus)}</dd>
                </div>
              )}
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
        {result?.complete && (
          <section
            className="panel production-accounting-panel"
            aria-label="Detailed production accounting"
          >
            {" "}
            {result?.complete && (
              <details className="reference-accounting">
                <summary>Detailed accounting · entire run</summary>
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
              </details>
            )}
          </section>
        )}
        {result?.complete && (
          <aside className="panel production-assumption-summary">
            <details className="production-assumptions-details">
              <summary>Your assumptions</summary>
              <dl>
                <div>
                  <dt>Crafts / upgrades</dt>
                  <dd>{draft.batches.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Material market</dt>
                  <dd>{draft.materialCity}</dd>
                </div>
                <div>
                  <dt>Sale market</dt>
                  <dd>{draft.outputCity}</dd>
                </div>
                <div>
                  <dt>Station fee / craft</dt>
                  <dd>{money(draft.stationFee)} silver</dd>
                </div>
                <div>
                  <dt>Sales tax</dt>
                  <dd>{draft.tax}%</dd>
                </div>
                <div>
                  <dt>Setup fee</dt>
                  <dd>{draft.setupFee}%</dd>
                </div>
              </dl>
              <p className="muted">
                These inputs define your estimate. Confirm fees and return assumptions at your
                station before crafting.
              </p>
              <a className="text-link" href={recipe.source} target="_blank" rel="noreferrer">
                Recipe source & limitations
              </a>
            </details>
          </aside>
        )}
      </div>
      <ProductionSensitivity configuration={configuration} />
      <ProductionPlan
        current={configuration}
        onEdit={(run) => {
          request.current?.abort();
          setDraft(run);
          setStep(1);
          document.getElementById("production-setup")?.focus();
        }}
      />
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
