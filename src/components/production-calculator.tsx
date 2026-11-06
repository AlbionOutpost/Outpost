"use client";
import { AnimatedNumber } from "./animated-number";
import { Silver } from "@/components/silver";
import { ProductionSensitivity } from "./production-sensitivity";
import { productionSensitivity } from "@/lib/albion/production-sensitivity";
import { EditorDialog } from "./editor-dialog";
import { ProductionProfile } from "./production-profile";
import { ArrowDown, ArrowRight, CircleCheck, RefreshCw } from "lucide-react";
import {
  CalculatorShell,
  ResultFigure,
  ResultPair,
  ResultRows,
  useCalculatorStep,
  RetryLine,
} from "./calculator-shell";
import { Disclosure } from "./disclosure";
import { PanelHead } from "./panel-head";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
import shell from "./calculator-shell.module.css";
import own from "@/app/production-calculator.module.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/link";
import { useOutpostRegion } from "./region-context";
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
  needsRecipeFeeConfirmation,
  productionSellsInstantly,
  type ProductionInput,
} from "@/lib/albion/production";
import { ItemIcon } from "./item-icon";
import { Missing, PRICE_ERROR } from "./calculator-figures";
import { sourceAge } from "@/lib/albion/source-age";
import { ScenarioControls } from "./scenario-controls";
import { prepareProductionRestore } from "@/lib/albion/recipe-restore";
import { ProductionPlan } from "./production-plan";
import {
  productionPriceQuery,
  mergeProductionObservations,
} from "@/lib/albion/production-observations";
// The shared calculator wells, plus the crafting family's own rules.
const s = { ...shell, ...own };
export function ProductionCalculator({
  kind,
  category,
  initialRecipeId,
}: {
  kind: ProductionInput["kind"];
  category?: "cooking" | "alchemy";
  initialRecipeId?: string;
}) {
  const region = useOutpostRegion();
  const router = useRouter();
  const defaultDraft = () => ({
    ...initialProduction(kind, region),
    ...(category ? { recipeId: recipes.find((r) => r.category === category)!.id } : {}),
  });
  const [draft, setDraft] = useState(() => ({
    ...defaultDraft(),
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
  const selectedRecipe = kind === "enchanting" ? undefined : findRecipe(draft.recipeId);
  const recipeKnown = kind === "enchanting" || !!selectedRecipe;
  const incompatibleRecipe =
    !!selectedRecipe &&
    (selectedRecipe.kind !== kind || (!!category && selectedRecipe.category !== category));
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
  const [step, goToStep] = useCalculatorStep([
    "production-setup",
    "production-materials",
    "production-results",
  ]);
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
  // Research-first: observations for the current recipe, markets and quality load on their own.
  // Manual prices survive unless "Replace manual overrides" is on, so a saved run keeps its edits.
  const loadRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    if (!recipeKnown || incompatibleRecipe) return;
    const timer = window.setTimeout(() => void loadRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [recipeKnown, incompatibleRecipe, requestKey]);
  async function load() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const requested = configuration;
    setPendingKey(requestKey);
    setAttemptedKey(requestKey);
    setError("");
    let failureMessage = PRICE_ERROR;
    try {
      const response = await fetch(`/api/economy/prices?${requestKey}`, {
        signal: controller.signal,
      });
      if (response.status === 429)
        failureMessage = "Too many market requests. Please wait a minute, then refresh.";
      if (!response.ok) throw new Error("Market request failed");
      const body = await response.json();
      if (controller.signal.aborted) return;
      const observedPrices = productionSchema.shape.prices.parse(body.prices);
      setDraft((d) =>
        mergeProductionObservations({ ...d, region }, requested, observedPrices, overwrite),
      );
    } catch {
      if (controller.signal.aborted) return;
      setError(failureMessage);
    } finally {
      if (request.current === controller) setPendingKey(null);
    }
  }
  useEffect(() => {
    loadRef.current = load;
  });
  if (!recipeKnown || incompatibleRecipe)
    return (
      <div className={s.journey}>
        <section
          className={`panel ${s.gate}`}
          role={recipeMissing || incompatibleRecipe ? "alert" : "status"}
        >
          {recipeMissing || incompatibleRecipe ? (
            <>
              <h2>
                {incompatibleRecipe ? "Recipe unavailable in this calculator" : "Recipe not found"}
              </h2>
              <p>
                {incompatibleRecipe
                  ? "This recipe belongs to another production calculator. Start with a recipe that works here."
                  : "This link or saved run names a recipe that is not in the game data."}
              </p>
              <Link
                className="button secondary"
                href={`/tools/${category || kind}?region=${region}`}
                onClick={() => {
                  setDraft(defaultDraft());
                  setRecipeMissing(false);
                  setError("");
                }}
              >
                Start with the default recipe
              </Link>
            </>
          ) : (
            <StatusLine>Loading recipe…</StatusLine>
          )}
        </section>
      </div>
    );
  const recipe = recipeFor(configuration);
  const confirmLegacyFees = needsRecipeFeeConfirmation(configuration, recipe);
  const enchantFamily = enchantable.find((f) => f.code === draft.enchantFamily);
  // Only show game-data results so the list never flips between two naming schemes mid-search.
  const browseRecipes = searchResults?.recipes ?? [];
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
      ...(key === "stationFee" ? { recipeSilverAccounting: "separate" as const } : {}),
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
  const money = (v: number | null | undefined) =>
    v === null || v === undefined
      ? "Unavailable"
      : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const coin = (v: number | null | undefined) =>
    v === null || v === undefined ? <Unavailable /> : <Silver value={v} digits={2} />;
  const current = (id: string, quality: number, city = draft.materialCity) => {
    const p = draft.prices[id];
    return p &&
      (p.manual || p.value !== 0) &&
      p.quality === quality &&
      (p.manual || (p.region === region && p.city === city)) &&
      // Black Market output is only priced by an instant-sale bid, as in production().
      (p.manual || city !== "Black Market" || p.execution === "instant-sale")
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
  const outputs = recipe.outputCount * draft.batches;
  const rowFor = (id: string) => result?.rows.find((row) => row.id === id);
  const kindLabel =
    category === "cooking"
      ? "Cooking recipe"
      : category === "alchemy"
        ? "Alchemy recipe"
        : kind === "crafting"
          ? "Crafting recipe"
          : kind === "refining"
            ? "Refining recipe"
            : "Enchantment upgrade";
  const profitTone = (v: number | null | undefined) =>
    v == null || v === 0 ? "even" : v < 0 ? "loss" : "gain";
  const outputPrice = current(recipe.output, outputQuality, draft.outputCity);
  const sourceNote = (p: ReturnType<typeof current>, city?: string) =>
    p?.manual ? (
      <span className={s.chip}>Manual</span>
    ) : p?.observedAt ? (
      <>
        {city && `${city} · `}
        <Observed at={p.observedAt} />
      </>
    ) : attempted ? (
      <Unavailable />
    ) : (
      "Loading price…"
    );
  const recipeBrowser = (
    <div className={s.browser} aria-label="Recipe browser" role="group">
      <div className={s.browserHead}>
        <label className={s.browserSearch}>
          <span>{kind === "enchanting" ? "Find equipment" : "Find a recipe"}</span>
          <input
            type="search"
            aria-label="Search crafting recipes"
            placeholder="Search by item name…"
            value={recipeSearch}
            onChange={(e) => setRecipeSearch(e.target.value)}
          />
        </label>
        <span className={s.browserCount}>
          {kind === "enchanting"
            ? `${enchantable.length} item families`
            : `${(searchResults?.total ?? browseRecipes.length).toLocaleString()} recipes`}
        </span>
      </div>
      {kind !== "enchanting" && (
        <div className={`segmented ${s.tiers}`} role="group" aria-label="Recipe tier">
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
      )}
      <div className={s.browserList}>
        {kind !== "enchanting" ? (
          <>
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
                <ItemIcon id={r.output} size={40} />
                <span>
                  <strong>{r.name.replace(/ · T\d\.\d.*$/, "").replace(/^T\d /, "")}</strong>
                  <small>
                    T{r.tier ?? r.output.match(/^T(\d)/)?.[1]}.{r.enchantment ?? 0}
                    {r.alternative && r.alternative > 1 ? ` · option ${r.alternative}` : ""} ·{" "}
                    {r.ingredients.length} materials
                  </small>
                </span>
                {r.id === draft.recipeId && <CircleCheck size={16} aria-hidden="true" />}
              </button>
            ))}
            {!searchResults && !searchError && <StatusLine>Loading recipes…</StatusLine>}
            {searchResults && !searchResults.recipes.length && (
              <StatusLine>No recipe matches. Try another item name.</StatusLine>
            )}
            {searchError && <StatusLine tone="error">{searchError}</StatusLine>}
            {searchResults && searchResults.total > searchResults.recipes.length && (
              <StatusLine>
                Showing {searchResults.recipes.length} of {searchResults.total.toLocaleString()}.
                Search to narrow the list.
              </StatusLine>
            )}
          </>
        ) : (
          enchantable
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
                {draft.enchantFamily === f.code && <CircleCheck size={16} aria-hidden="true" />}
              </button>
            ))
        )}
      </div>
      <p className={s.browserNote}>
        Every crafting, refining, cooking and alchemy recipe in the game data, including enchanted
        and artifact versions.
      </p>
    </div>
  );
  const setup = (
    <>
      <div className={s.identity} data-recipe-identity="">
        <ItemIcon id={recipe.output} quality={outputQuality} size={64} />
        <div>
          <h3>{recipe.name}</h3>
          <p>
            {kindLabel} · {recipe.outputCount} output per craft
          </p>
          <small data-recipe-status="" className={recipe.historical ? s.historical : undefined}>
            {recipe.historical
              ? "Historical recipe · Confirm ingredients and station settings in game."
              : "Check the recipe and your station settings in game."}
          </small>
        </div>
        <button
          type="button"
          className="button secondary"
          onClick={() => setRecipePickerOpen(true)}
        >
          Change recipe
        </button>
      </div>
      {kind === "enchanting" && (
        <div className={s.fields}>
          <label>
            Equipment family
            <WellSelect
              aria-label="Enchantment equipment"
              value={draft.enchantFamily}
              onChange={(e) => update("enchantFamily", e.target.value)}
            >
              {enchantable.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.name}
                </option>
              ))}
            </WellSelect>
          </label>
          <label>
            Tier
            <WellSelect
              aria-label="Enchantment tier"
              value={draft.tier}
              onChange={(e) => update("tier", Number(e.target.value))}
            >
              {(enchantFamily?.tiers ?? [4, 5, 6, 7, 8]).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </WellSelect>
          </label>
          <label>
            From enchantment
            <WellSelect
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
            </WellSelect>
          </label>
          <label>
            To enchantment
            <WellSelect
              aria-label="To enchantment"
              value={draft.toEnchant}
              onChange={(e) => update("toEnchant", Number(e.target.value))}
            >
              {[1, 2, 3]
                .filter((t) => t > draft.fromEnchant)
                .map((t) => (
                  <option key={t}>{t}</option>
                ))}
            </WellSelect>
          </label>
        </div>
      )}
      <div className={s.fields}>
        <label>
          Buy materials in
          <WellSelect
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
          </WellSelect>
        </label>
        <label>
          Sell in
          <WellSelect
            aria-label="Output sale market"
            value={draft.outputCity}
            onChange={(e) => update("outputCity", e.target.value as ProductionInput["outputCity"])}
          >
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </WellSelect>
        </label>
        <div className={s.qty}>
          <label htmlFor="production-batches">Crafts / upgrades</label>
          <div className={s.qtyWell}>
            <input
              id="production-batches"
              type="number"
              min={1}
              max={100000}
              value={draft.batches}
              onChange={(e) => update("batches", Number(e.target.value))}
            />
            <div
              className={`segmented ${s.quick}`}
              role="group"
              aria-label="Batch quantity shortcuts"
            >
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
          </div>
        </div>
        <label>
          Output quality
          <WellSelect
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
          </WellSelect>
        </label>
      </div>
      {confirmLegacyFees && (
        <div className={s.notice} role="alert">
          <p>
            This saved run predates automatic recipe silver costs. Its recorded fee is{" "}
            {money(draft.stationFee)} silver per craft; the recipe requires{" "}
            {money(recipe.silver ?? 0)}. Confirm what the recorded fee includes.
          </p>
          <div className={s.noticeActions}>
            <button
              type="button"
              className="button secondary"
              onClick={() => update("recipeSilverAccounting", "separate")}
            >
              Treat recorded fee as additional
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={draft.stationFee < (recipe.silver ?? 0)}
              onClick={() => update("stationFee", draft.stationFee - (recipe.silver ?? 0))}
            >
              Recorded fee includes recipe silver
            </button>
          </div>
          {draft.stationFee < (recipe.silver ?? 0) && (
            <p>
              The recorded fee is below the recipe requirement. Confirm it as additional or edit the
              additional station fee.
            </p>
          )}
        </div>
      )}
      <Disclosure summary="Station settings, focus & sources">
        <div className={s.stack}>
          <Disclosure summary="Markets & transaction fees">
            <div className={s.fields}>
              <label className={s.wide}>
                Additional station / upgrade fee per craft
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={draft.stationFee}
                  onChange={(e) => update("stationFee", Number(e.target.value))}
                />
              </label>
              <p className={s.help}>
                {recipe.silver === undefined
                  ? "No fixed recipe silver charge is recorded for this recipe. Confirm charges in game and enter them above."
                  : `The recipe's own ${money(recipe.silver)} silver per craft is already included. Enter only extra station charges.`}
              </p>
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
              {productionSellsInstantly(draft) && (
                <p className={s.help}>
                  The Black Market buys instantly at its highest buy order, so only sales tax
                  applies; the setup fee is not charged.
                </p>
              )}
            </div>
          </Disclosure>
          {kind !== "enchanting" && (
            <Disclosure
              summary="Returns & focus"
              defaultOpen={draft.returnRate > 0 || draft.useFocus}
            >
              <div className={s.fields}>
                <p className={s.help}>
                  Enter the return rates and focus cost your station shows, then tick the materials
                  that return. Returned materials are valued at what you paid for them.
                </p>
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
                  Focus
                  <WellSelect
                    aria-label="Use focus assumptions"
                    value={draft.useFocus ? "yes" : "no"}
                    onChange={(e) => update("useFocus", e.target.value === "yes")}
                  >
                    <option value="no">No focus</option>
                    <option value="yes">Use entered focus values</option>
                  </WellSelect>
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
              <Disclosure summary="Convert a station production bonus to return rate">
                <div className={s.fields}>
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
                  <p className={s.help}>
                    Return rate{" "}
                    <strong>
                      {bonus >= 0 && bonus <= 1000
                        ? `${(returnRateFromBonus(bonus) * 100).toFixed(3)}%`
                        : "Invalid"}
                    </strong>{" "}
                    = 100 × (1 − 1 / (1 + bonus / 100)). Check your station, then enter it above.
                  </p>
                </div>
              </Disclosure>
            </Disclosure>
          )}
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
          <Disclosure summary="Model notes & recipe source">
            <div className={s.stack}>
              <p className={s.help}>
                {kind === "enchanting"
                  ? `Rune, soul and relic upgrades for ${enchantable.length} item families, .0 to .3, from game data captured 27 Oct 2026.`
                  : "Recipes come from game item data captured 27 Oct 2026, with every alternative."}{" "}
                Confirm quantities after a patch. Tax, fees and output quality are your assumptions,
                not verified game defaults or quality odds.
              </p>
              {recipe.source.startsWith("https://") &&
              !/albiononlinegrind|albionutil/i.test(recipe.source) ? (
                <a className="text-link" href={recipe.source} target="_blank" rel="noreferrer">
                  Recipe reference
                </a>
              ) : (
                <p className={s.help}>
                  Recipe source:{" "}
                  {recipe.source.startsWith("https://") ? "archived game data" : recipe.source}.{" "}
                  <Link className="text-link" href="/guides">
                    Recipe & planning guides →
                  </Link>
                </p>
              )}
            </div>
          </Disclosure>
        </div>
      </Disclosure>
    </>
  );
  const materials = (
    <>
      {busy ? (
        <StatusLine>Loading prices from {draft.materialCity}…</StatusLine>
      ) : error ? (
        <RetryLine onRetry={load}>{error}</RetryLine>
      ) : attempted && !result?.complete ? (
        <StatusLine tone="stale">
          Some prices weren’t observed for this market or quality. Type the missing ones; observed
          prices keep their times.
        </StatusLine>
      ) : null}
      <div className={s.materials} role="region" aria-label="Material requirements and pricing">
        <div className={s.matHead} aria-hidden="true">
          <span>Material</span>
          <span>Unit price</span>
          <span>Total</span>
        </div>
        <ul>
          {recipe.ingredients.map((i) => {
            const q = i.quality === "selected" ? draft.quality : 1;
            const p = current(i.id, q);
            const gross = rowFor(i.id)?.gross;
            return (
              <li key={i.id} className={s.mat}>
                <ItemIcon id={i.id} size={40} />
                <span className={s.matName}>
                  <strong>{i.name}</strong>
                  <small>
                    {draft.batches > 1
                      ? `${(i.quantity * draft.batches).toLocaleString()} needed · ${i.quantity} per craft`
                      : `${i.quantity} per craft`}
                  </small>
                  <small>{sourceNote(p)}</small>
                  {kind !== "enchanting" && (
                    <label className={s.returns}>
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
                </span>
                <input
                  className={s.matInput}
                  aria-label={`${i.name} unit price`}
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Price"
                  value={p?.value ?? ""}
                  onChange={(e) => price(i.id, q, e.target.value)}
                />
                <span className={s.matTotal}>
                  <span className="sr-only">Total </span>
                  {gross == null ? <Missing /> : <Silver value={gross} digits={2} />}
                </span>
              </li>
            );
          })}
          <li className={`${s.mat} ${s.matOutput}`}>
            <ItemIcon id={recipe.output} quality={outputQuality} size={40} />
            <span className={s.matName}>
              <strong>Sells for</strong>
              <small>
                {outputs.toLocaleString()} output{outputs === 1 ? "" : "s"} ·{" "}
                {productionSellsInstantly(draft) ? "Black Market buy order" : draft.outputCity}
              </small>
              <small>{sourceNote(outputPrice)}</small>
            </span>
            <input
              className={s.matInput}
              aria-label="Output unit sale price"
              type="number"
              min={0}
              step="any"
              placeholder="Price"
              value={outputPrice?.value ?? ""}
              onChange={(e) => price(recipe.output, outputQuality, e.target.value)}
            />
            <span className={s.matTotal}>
              <span className="sr-only">Total </span>
              {result?.revenue == null ? <Missing /> : <Silver value={result.revenue} digits={2} />}
            </span>
          </li>
        </ul>
      </div>
      <label className={s.overwrite}>
        When refreshing
        <WellSelect
          aria-label="Replace manual overrides"
          value={overwrite ? "yes" : "no"}
          onChange={(e) => setOverwrite(e.target.value === "yes")}
        >
          <option value="no">Keep prices I typed</option>
          <option value="yes">Replace all from source</option>
        </WellSelect>
      </label>
    </>
  );
  const sensitivity = productionSensitivity(configuration);
  const results = (
    <>
      <div className={s.resultItem}>
        <ItemIcon id={recipe.output} quality={outputQuality} size={52} />
        <span>
          <strong>{recipe.name}</strong>
          <small>
            {outputs.toLocaleString()} output{outputs === 1 ? "" : "s"} · buy in{" "}
            {draft.materialCity} · sell in {draft.outputCity}
          </small>
        </span>
      </div>
      {validation && (
        <p role="alert" className={s.alert}>
          {validation}
        </p>
      )}
      {result?.complete ? (
        <ResultFigure
          label="Total profit"
          tone={profitTone(result.profit)}
          value={
            <output aria-label="Estimated total profit" data-result="total-profit">
              {coin(result.profit)}
            </output>
          }
          note={`${
            result.profit === null
              ? "Unavailable"
              : result.profit > 0
                ? "Gain"
                : result.profit < 0
                  ? "Loss"
                  : "Break-even"
          } for ${outputs.toLocaleString()} ${outputs === 1 ? "output" : "outputs"}`}
          aside={{
            label: "Margin",
            value:
              result.margin === null ? (
                <Missing />
              ) : (
                <AnimatedNumber value={result.margin} digits={1} minimumDigits={0} suffix="%" />
              ),
          }}
        />
      ) : (
        <ResultFigure
          label="Total profit"
          value={<Missing />}
          note={
            busy
              ? "Loading prices…"
              : error
                ? "Prices are missing; type them in step 2"
                : attempted
                  ? "Finish pricing your run"
                  : "Price this run to see your profit"
          }
          aside={{ label: "Margin", value: <Missing /> }}
        />
      )}
      <ResultPair
        result="cash-summary"
        items={[
          {
            label: "Upfront silver",
            value: result?.complete ? (
              coin(result.upfront)
            ) : (
              <span className={s.na}>
                <Unavailable />
              </span>
            ),
          },
          {
            label: `Sells for (${outputs.toLocaleString()})`,
            value: result?.complete ? (
              coin(result.revenue)
            ) : (
              <span className={s.na}>
                <Unavailable />
              </span>
            ),
          },
        ]}
      />
      {result && !result.complete && (
        <div className={s.readiness} data-result="readiness" role="status">
          <strong>
            {missingPrices.length} {missingPrices.length === 1 ? "price" : "prices"} to go
          </strong>
          <ul>
            {missingPrices.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <button type="button" className="button secondary" onClick={() => goToStep(2)}>
            Add prices <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {result?.stale && (
        <StatusLine tone="stale">
          Stale or undated source observations included. Refresh before acting.
        </StatusLine>
      )}
      {result?.complete && (
        <>
          <ResultRows
            items={[
              {
                label: "Profit per output",
                value: coin(result.profitPerItem),
                tone: profitTone(result.profitPerItem),
              },
              {
                label: "Cost per output",
                value: coin(result.cost === null ? null : result.cost / outputs),
              },
              { label: "Net cash profit", value: coin(result.cashProfit) },
              { label: "Retained return value", value: coin(result.returnCredit) },
              ...(draft.useFocus
                ? [
                    {
                      label: "Profit per focus",
                      value:
                        result.profitPerFocus == null ? (
                          <Unavailable />
                        ) : (
                          <AnimatedNumber
                            value={result.profitPerFocus}
                            digits={2}
                            minimumDigits={0}
                          />
                        ),
                    },
                  ]
                : []),
            ]}
          />
          <p className={s.resultNote}>
            {Object.values(draft.prices).some((p) => p.manual)
              ? "Includes prices you typed. "
              : "From observed prices with their times. "}
            Fees, returns and tax are your assumptions; returned materials are counted apart from
            cash.
          </p>
        </>
      )}
    </>
  );
  const details = result?.complete ? (
    <section className={`panel ${s.details}`} aria-labelledby="production-details-title">
      <PanelHead
        id="production-details-title"
        title="Run details"
        line="How the profit moves with the sale price, the full accounting and what you assumed."
      />
      <div className={s.detailsGrid}>
        {sensitivity.length > 0 && <ProductionSensitivity rows={sensitivity} />}
        <div className={s.detailsCol}>
          <Disclosure summary="Detailed accounting · entire run">
            <ResultRows
              items={[
                ["Total material cost", result.grossMaterials],
                ["Recipe silver requirements", result.recipeCost],
                ["Station / upgrade fees", result.stationCost],
                ["Upfront silver requirement", result.upfront],
                ["Expected returned material value", result.returnCredit],
                ["Effective production cost", result.cost],
                ["Gross output revenue", result.revenue],
                ["Taxes and setup fees", result.fees],
                ["Cash profit before valuing retained returns", result.cashProfit],
                ["Profit margin (%)", result.margin],
                ["ROI on effective cost (%)", result.roi],
                ["Profit per output", result.profitPerItem],
                ...(draft.useFocus
                  ? [
                      ["Profit per focus", result.profitPerFocus],
                      ["Additional material value per focus", result.incrementalPerFocus],
                    ]
                  : []),
              ].map(([label, value]) => ({
                label: String(label),
                value:
                  value == null ? (
                    <Unavailable />
                  ) : (
                    <AnimatedNumber value={value as number} digits={2} minimumDigits={0} />
                  ),
              }))}
            />
          </Disclosure>
          <Disclosure summary="Your assumptions">
            <ResultRows
              items={[
                { label: "Crafts / upgrades", value: draft.batches.toLocaleString() },
                { label: "Material market", value: draft.materialCity },
                { label: "Sale market", value: draft.outputCity },
                { label: "Recipe silver / craft", value: `${money(recipe.silver ?? 0)} silver` },
                { label: "Station fee / craft", value: `${money(draft.stationFee)} silver` },
                { label: "Sales tax", value: `${draft.tax}%` },
                {
                  label: "Setup fee",
                  value: productionSellsInstantly(draft)
                    ? "Not charged (instant sale)"
                    : `${draft.setupFee}%`,
                },
              ]}
            />
            <p className={s.help}>
              Confirm fees and returns at your station before crafting.{" "}
              <a className="text-link" href={recipe.source} target="_blank" rel="noreferrer">
                Recipe source & limitations
              </a>
            </p>
          </Disclosure>
        </div>
      </div>
    </section>
  ) : null;
  return (
    <div className={s.journey}>
      <div className={s.modeBar}>
        <nav ref={modeNavigation} className={s.modes} aria-label="Production calculators">
          {(["crafting", "refining", "enchanting", "cooking", "alchemy"] as const).map((mode) => (
            <Link
              key={mode}
              href={`/tools/${mode}?region=${region}`}
              aria-current={(category || kind) === mode ? "page" : undefined}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Link>
          ))}
        </nav>
        <a className="pill-link" href="#production-plan-title">
          Production plan <ArrowDown size={15} aria-hidden="true" />
        </a>
      </div>
      {recipePickerOpen && (
        <EditorDialog open title="Choose recipe" drawer onClose={() => setRecipePickerOpen(false)}>
          {recipeBrowser}
        </EditorDialog>
      )}
      <CalculatorShell
        label="Crafting workflow"
        details={details}
        step={step}
        onStep={goToStep}
        summary={{
          label: "Total profit",
          tone: result?.complete ? profitTone(result.profit) : "even",
          value: result?.complete ? (
            coin(result.profit)
          ) : (
            <span className={s.summaryPending}>
              {missingPrices.length
                ? `${missingPrices.length} ${missingPrices.length === 1 ? "price" : "prices"} to go`
                : "Unavailable"}
            </span>
          ),
        }}
        steps={[
          {
            id: "production-setup",
            label: "Choose recipe",
            title: kind === "enchanting" ? "Item and upgrade" : "Recipe and run",
            line: "What you make, where you trade and how many.",
            children: setup,
          },
          {
            id: "production-materials",
            label: "Price materials",
            title: "Prices",
            line: `Buy in ${draft.materialCity} · ${
              productionSellsInstantly(draft)
                ? "sell instantly to the Black Market"
                : `sell in ${draft.outputCity}`
            }. Type any price to override it.`,
            actions: (
              <button
                type="button"
                className={`button secondary ${s.refresh}`}
                aria-label="Refresh market observations"
                aria-busy={busy}
                onClick={load}
              >
                <RefreshCw size={15} aria-hidden="true" />
                {busy ? "Updating…" : "Refresh"}
              </button>
            ),
            children: materials,
          },
          {
            id: "production-results",
            label: "Review profit",
            title: "Profit",
            children: results,
          },
        ]}
      />
      <ProductionPlan
        current={configuration}
        onEdit={(run) => {
          request.current?.abort();
          setDraft(run);
          goToStep(1);
        }}
        runAction={
          <button
            type="button"
            className="button secondary"
            aria-expanded={showScenarios}
            aria-controls="production-scenarios"
            onClick={() => setShowScenarios(!showScenarios)}
          >
            Saved runs & sharing
          </button>
        }
      >
        <div id="production-scenarios" className={s.scenarios} hidden={!showScenarios}>
          <ScenarioControls
            prepare={prepareProductionRestore}
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
      </ProductionPlan>
      <section className={`raised has-scene ${s.cta}`} data-scene="city">
        <h2>
          Buying for more than one <em>craft</em>?
        </h2>
        <p>
          Add each run to the production plan, then send its materials to the Crafting Planner and
          tick them off as you buy.
        </p>
        <div className={s.ctaActions}>
          <Link className="button primary" href={`/shopping-list?region=${region}`}>
            Open the Crafting Planner <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="button secondary" href={`/tools?region=${region}`}>
            All tools
          </Link>
        </div>
      </section>
    </div>
  );
}

/** A source observation's age with its exact UTC time kept on the element; Stale past an hour. */
function Observed({ at }: { at: string }) {
  const age = sourceAge(at);
  const exact = `${at.replace("T", " ").slice(0, 16)} UTC`;
  return (
    <>
      <time dateTime={at} title={exact}>
        {age.label}
        <span className="sr-only"> ({exact})</span>
      </time>
      {age.stale && <span className={`${s.chip} ${s.stale}`}>Stale</span>}
    </>
  );
}
