"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { PanelHead } from "./panel-head";
import { Disclosure } from "./disclosure";
import {
  productionPlan,
  productionPlanSchema,
  type ProductionPlanInput,
} from "@/lib/albion/production-plan";
import {
  productionSchema,
  needsRecipeFeeConfirmation,
  type ProductionInput,
} from "@/lib/albion/production";
import { recipeFor } from "@/lib/albion/recipes";
import { prepareProductionRestore } from "@/lib/albion/recipe-restore";
import { ScenarioControls } from "./scenario-controls";
import { AddToShopping } from "./add-to-shopping";
import { shoppingFromProduction } from "@/lib/albion/shopping";
import { ItemIcon } from "./item-icon";
import { Unavailable } from "./status-line";
import "@/app/production-plan.css";
import {
  productionPriceQuery,
  mergeProductionObservations,
} from "@/lib/albion/production-observations";
import { NumberField } from "./number-field";

const silver = (value: number | null) =>
  value === null ? <Unavailable /> : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
export function ProductionPlan({
  current,
  onEdit,
  runAction,
  children,
}: {
  current: ProductionInput;
  onEdit: (run: ProductionInput) => void;
  /** A second head action for the single run (saving and sharing it). */
  runAction?: React.ReactNode;
  /** Content for that action, under the head. */
  children?: React.ReactNode;
}) {
  const [plan, setPlan] = useState<ProductionPlanInput>({
    kind: "production-plan",
    region: current.region,
    runs: [],
  });
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // The plan sits under the calculator as one summary row; "Open plan" shows the runs, totals,
  // shopping list and saved plans. A link to the plan (a dashboard entry, a share link) opens it.
  const [open, setOpen] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const followHash = () => {
      if (location.hash.startsWith("#production-plan")) setOpen(true);
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, []);
  let result: ReturnType<typeof productionPlan> | null = null;
  let error = "";
  try {
    if (plan.runs.length) result = productionPlan(plan);
  } catch (e) {
    error = e instanceof Error ? e.message : "Check plan inputs";
  }
  const valid = productionSchema.safeParse(current).success;
  const sameServer = !plan.runs.length || plan.region === current.region;
  const legacyFees = plan.runs.flatMap((configuration, index) => {
    try {
      const recipe = recipeFor(configuration);
      return needsRecipeFeeConfirmation(configuration, recipe)
        ? [{ configuration, recipe, index }]
        : [];
    } catch {
      return [];
    }
  });
  function confirmPlanFee(index: number, includesRecipe: boolean) {
    setPlan((currentPlan) => ({
      ...currentPlan,
      runs: currentPlan.runs.map((run, i) =>
        i !== index
          ? run
          : {
              ...run,
              stationFee: includesRecipe
                ? run.stationFee - (recipeFor(run).silver ?? 0)
                : run.stationFee,
              recipeSilverAccounting: "separate",
            },
      ),
    }));
  }
  async function refreshPrices() {
    const requested = plan;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setMessage("Refreshing plan observations. Manual prices will be kept.");
    const queries = [...new Set(requested.runs.map(productionPriceQuery))];
    const observed = new Map<string, ProductionInput["prices"]>();
    let failed = 0;
    async function worker() {
      for (let query = queries.shift(); query; query = queries.shift()) {
        try {
          const response = await fetch(`/api/economy/prices?${query}`, {
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
          });
          if (!response.ok) throw new Error();
          const body = await response.json();
          observed.set(query, productionSchema.shape.prices.parse(body.prices));
        } catch {
          failed++;
        }
        if (controller.signal.aborted) return;
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    if (controller.signal.aborted) return;
    setPlan((currentPlan) =>
      currentPlan !== requested
        ? currentPlan
        : {
            ...requested,
            runs: requested.runs.map((run) => {
              const prices = observed.get(productionPriceQuery(run));
              return prices ? mergeProductionObservations(run, run, prices, false) : run;
            }),
          },
    );
    setBusy(false);
    setMessage(
      `${observed.size} price requests refreshed${failed ? `; ${failed} unavailable, kept your previous inputs` : ""}. Manual prices kept. Missing observations remain incomplete.`,
    );
  }
  function add() {
    try {
      const parsed = productionSchema.parse(current);
      const next = { ...plan, region: parsed.region, runs: [...plan.runs, parsed] };
      productionPlan(next);
      setPlan(next);
      setMessage("Recipe added. Save the plan to keep it when you leave this page.");
    } catch {
      setMessage("Cannot add this recipe. Check the inputs or the 30-recipe plan limit.");
    }
  }
  function exportPlan() {
    const blob = new Blob([JSON.stringify(productionPlanSchema.parse(plan), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `outpost-production-${plan.region}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Plan exported with static assumptions and original price timestamps.");
  }
  const addButton = (
    <button
      className="button secondary"
      type="button"
      onClick={add}
      disabled={busy || !valid || !sameServer || plan.runs.length >= 30}
    >
      <Plus size={16} aria-hidden="true" /> Add current recipe
    </button>
  );
  const summary = !plan.runs.length
    ? "Add runs to one plan for a single shopping list. Each run keeps its own prices and settings."
    : `${plan.runs.length} / 30 recipes · ${plan.region} · ${
        result?.complete && result.profit !== null
          ? `estimated profit ${result.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })} silver`
          : "some prices missing, totals are incomplete"
      }`;
  return (
    <section
      className="production-plan panel"
      data-open={open ? "" : undefined}
      aria-labelledby="production-plan-title"
    >
      <PanelHead
        id="production-plan-title"
        emblem="tool-planner"
        title="Production plan"
        line={summary}
        actions={
          <>
            {runAction}
            {addButton}
            <button
              type="button"
              className="button secondary production-plan-toggle"
              aria-expanded={open}
              aria-controls="production-plan-body"
              onClick={() => setOpen(!open)}
            >
              {open ? "Close plan" : "Open plan"}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </>
        }
      />
      {children}
      {!sameServer && (
        <p className="notice">
          This plan belongs to {plan.region}. Switch back to that server to add recipes, or remove
          its runs to start a new plan.
        </p>
      )}
      <div id="production-plan-body" className="production-plan-body" hidden={!open}>
        {!plan.runs.length && (
          <p className="production-plan-empty">
            No runs yet. Set one up above and add it; missing prices are fine.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {legacyFees.map(({ configuration, recipe, index }) => (
          <div className="task-state" key={index}>
            <p>
              Recipe {index + 1}: {recipe.name}. This saved run records{" "}
              {silver(configuration.stationFee)} silver per craft; the recipe requires{" "}
              {silver(recipe.silver ?? 0)}. Confirm whether that fee includes recipe silver before
              calculating the plan.
            </p>
            <button
              type="button"
              className="button secondary"
              onClick={() => confirmPlanFee(index, false)}
            >
              Treat recipe {index + 1} fee as additional
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={configuration.stationFee < (recipe.silver ?? 0)}
              onClick={() => confirmPlanFee(index, true)}
            >
              Recipe {index + 1} fee includes recipe silver
            </button>
            {configuration.stationFee < (recipe.silver ?? 0) && (
              <p>
                The recorded fee is below the fixed recipe requirement. Confirm it as additional to
                continue.
              </p>
            )}
          </div>
        ))}
        {result && (
          <>
            <div className="production-plan-status">
              <strong>
                {plan.runs.length} / 30 recipes · {plan.region}
              </strong>
              <span>
                {result.complete
                  ? "All required prices supplied"
                  : "Some prices missing, totals are incomplete"}
                {result.stale ? " · Includes stale observations" : ""}
              </span>
            </div>
            <div className="production-plan-runs">
              {result.runs.map(({ configuration, recipe, result: run }, index) => (
                <article key={index} className="production-plan-run">
                  <ItemIcon
                    id={recipe.output}
                    quality={configuration.kind === "refining" ? 1 : configuration.quality}
                    size={40}
                  />
                  <div className="production-plan-identity">
                    <h3>{recipe.name}</h3>
                    <p>
                      {configuration.batches} crafts · {configuration.materialCity} →{" "}
                      {configuration.outputCity}
                    </p>
                    <small>
                      {Object.values(configuration.prices).some((p) => p.manual && p.value !== null)
                        ? "Includes manual prices"
                        : "Observation-based inputs"}
                      {run.stale ? " · Stale observations" : ""}
                    </small>
                  </div>
                  <label>
                    Crafts
                    <NumberField
                      min={1}
                      max={100000}
                      value={configuration.batches}
                      onValueChange={(v) => {
                        const batches = v ?? NaN;
                        if (!Number.isInteger(batches) || batches < 1 || batches > 100000) return;
                        const next = {
                          ...plan,
                          runs: plan.runs.map((r, i) => (i === index ? { ...r, batches } : r)),
                        };
                        // Actual focus is a run-level assumption; require editing rather than scaling it implicitly.
                        if (configuration.useFocus) {
                          setMessage(
                            "Edit this focused recipe above and confirm the actual focus cost before updating its quantity.",
                          );
                          return;
                        }
                        try {
                          productionPlan(next);
                          setPlan(next);
                        } catch {
                          setMessage("This quantity exceeds the plan total limit.");
                        }
                      }}
                    />
                  </label>
                  <div className="production-plan-profit">
                    <small>Estimated profit · silver</small>
                    <strong>{silver(run.profit)}</strong>
                  </div>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={
                      configuration.kind !== current.kind || configuration.region !== current.region
                    }
                    onClick={() => {
                      onEdit(configuration);
                      setEditing(index);
                      setMessage(
                        "Recipe loaded above. Adjust inputs, then replace this planned recipe.",
                      );
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    aria-label={`Remove recipe ${index + 1}: ${recipe.name}`}
                    onClick={() => {
                      setPlan({ ...plan, runs: plan.runs.filter((_, i) => i !== index) });
                      setEditing(null);
                      setMessage("Recipe removed.");
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
            {editing !== null && (
              <div className="production-plan-edit">
                <p>
                  Editing recipe {editing + 1}. The plan keeps its previous inputs until you replace
                  it.
                </p>
                <button
                  className="button secondary"
                  disabled={!valid || !sameServer}
                  onClick={() => {
                    try {
                      const next = {
                        ...plan,
                        runs: plan.runs.map((r, i) =>
                          i === editing ? productionSchema.parse(current) : r,
                        ),
                      };
                      productionPlan(next);
                      setPlan(next);
                      setEditing(null);
                      setMessage("Planned recipe updated.");
                    } catch {
                      setMessage(
                        "Could not update this recipe. Check plan inputs and total limits.",
                      );
                    }
                  }}
                >
                  Replace planned recipe
                </button>
                <button className="button secondary" onClick={() => setEditing(null)}>
                  Cancel edit
                </button>
              </div>
            )}
            <div className="production-plan-stats">
              <div>
                <small>Estimated profit · silver</small>
                <strong>{silver(result.profit)}</strong>
              </div>
              <div>
                <small>Upfront cash · silver</small>
                <strong>{silver(result.upfront)}</strong>
              </div>
              <div>
                <small>Cash profit before returns · silver</small>
                <strong>{silver(result.cashProfit)}</strong>
              </div>
              <div>
                <small>Recipe silver requirements</small>
                <strong>{silver(result.recipeCost)}</strong>
              </div>
              <div>
                <small>Margin on sales</small>
                <strong>
                  {result.margin === null ? <Unavailable /> : `${silver(result.margin)}%`}
                </strong>
              </div>
            </div>
            <div className="production-plan-subhead">
              <h3>Shopping list</h3>
              <AddToShopping
                region={plan.region}
                label="Send to shopping list"
                entries={shoppingFromProduction(result.materials)}
              />
            </div>
            <p className="production-plan-note">
              Gross materials required before crafting. Returned resources are valued as a credit;
              they are not deducted from your shopping quantities. Different markets and qualities
              stay separate.
            </p>
            <div
              className="production-plan-table table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Production shopping list"
            >
              <table data-density="compact">
                <thead>
                  <tr>
                    <th scope="col">Material / market</th>
                    <th scope="col" className="numeric">
                      Quality
                    </th>
                    <th scope="col" className="numeric">
                      Required
                    </th>
                    <th scope="col" className="numeric">
                      Cost · silver
                    </th>
                    <th scope="col">Price basis</th>
                  </tr>
                </thead>
                <tbody>
                  {result.materials.map((row) => (
                    <tr key={`${row.city}/${row.id}/${row.quality}`}>
                      <th scope="row">
                        <span className="production-plan-material">
                          <ItemIcon id={row.id} quality={row.quality} size={32} />
                          <span>
                            {row.name}
                            <small>{row.city}</small>
                          </span>
                        </span>
                      </th>
                      <td className="numeric">{row.quality}</td>
                      <td className="numeric">{silver(row.quantity)}</td>
                      <td className="numeric">{silver(row.gross)}</td>
                      <td>
                        {[...row.sources].map((source) => (
                          <small key={source}>{source}</small>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Disclosure summary="Detailed accounting & assumptions">
              <dl className="production-plan-accounting">
                {(
                  [
                    ["Gross sale value", result.revenue],
                    ["Sales and setup fees", result.fees],
                    ["Retained-resource credit", result.returnCredit],
                    ["Economic cost after returns", result.cost],
                    ["Actual focus entered", result.focus],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      {silver(value)}
                      {label === "Actual focus entered" ? " focus" : " silver"}
                    </dd>
                  </div>
                ))}
              </dl>
              <p>
                Recipe snapshots are current-patch unverified. Each recipe uses its own supplied
                fees, return eligibility and price inputs. No automatic intermediate-material
                transfers, journals, weight or station rounding are included. Editing a focused
                recipe requires confirming its actual focus cost.
              </p>
            </Disclosure>
            <div className="production-plan-actions">
              <button className="button secondary" disabled={busy} onClick={refreshPrices}>
                {busy ? "Refreshing plan prices…" : "Refresh plan observations"}
              </button>
              <button className="button secondary" onClick={exportPlan}>
                Export plan JSON
              </button>
            </div>
          </>
        )}
        <Disclosure summary="Save or restore a production plan">
          <ScenarioControls
            prepare={prepareProductionRestore}
            schema={productionPlanSchema}
            configuration={plan}
            hashKey="production-plan"
            onLoad={(value) => {
              setPlan(value);
              setEditing(null);
              setOpen(true);
            }}
          />
        </Disclosure>
      </div>
      {message && (
        <p className="production-plan-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
