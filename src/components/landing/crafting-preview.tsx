"use client";
import { useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
import { ItemIcon } from "@/components/item-icon";
import { useAtlasRegion } from "@/components/region-context";
import { sourceAge } from "@/lib/albion/source-age";
import { Minus, Plus } from "lucide-react";
import { PreviewStatus } from "./preview-shell";

const preview = z.object({
  recipe: z.object({
    id: z.string(),
    name: z.string(),
    output: z.string(),
    kind: z.enum(["crafting", "refining"]),
  }),
  assumptions: z.object({
    city: z.string(),
    batches: z.number(),
    returnRate: z.number(),
    useFocus: z.boolean(),
    stationFee: z.number(),
    tax: z.number(),
    setupFee: z.number(),
  }),
  rows: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      quantity: z.number(),
      unit: z.number().nullable(),
      gross: z.number().nullable(),
      observedAt: z.string().nullable(),
    }),
  ),
  output: z.object({
    quantity: z.number(),
    unit: z.number().nullable(),
    observedAt: z.string().nullable(),
  }),
  complete: z.boolean(),
  missing: z.array(z.string()),
  stale: z.boolean(),
  upfront: z.number().nullable(),
  revenue: z.number().nullable(),
  fees: z.number().nullable(),
  profit: z.number().nullable(),
  profitPerItem: z.number().nullable(),
  margin: z.number().nullable(),
});
type Preview = z.infer<typeof preview>;
type State =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Preview; fetchedAt: number };
export type PreviewRecipe = { id: string; name: string; output: string };

const silver = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * One real production scenario run through the same service as the calculator, priced from
 * current observations. The tabs switch between crafting and refining recipes, the batch
 * stepper and city select re-price live, and the assumptions are shown next to the result.
 * A missing price leaves the result missing.
 */
export function CraftingPreview({
  crafting,
  refining,
  cities,
  initialCity,
}: {
  crafting: readonly PreviewRecipe[];
  refining: readonly PreviewRecipe[];
  cities: readonly string[];
  initialCity: string;
}) {
  const region = useAtlasRegion();
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const [seen, setSeen] = useState(false);
  const [kind, setKind] = useState<"crafting" | "refining">("crafting");
  const [recipeIds, setRecipeIds] = useState({
    crafting: crafting[0].id,
    refining: refining[0].id,
  });
  const [city, setCity] = useState(initialCity);
  const [batches, setBatches] = useState(1);
  const [result, setResult] = useState<{ key: string; value: State } | null>(null);
  const recipes = kind === "crafting" ? crafting : refining;
  const recipeId = recipeIds[kind];
  const chosen = recipes.find((r) => r.id === recipeId) ?? recipes[0];
  const key = `${region}:${recipeId}:${city}:${batches}`;
  const state: State = !seen
    ? { status: "idle" }
    : result?.key === key
      ? result.value
      : { status: "loading" };

  useEffect(() => {
    const target = root.current;
    if (!target || seen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        setSeen(true);
      },
      { rootMargin: "120px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [seen]);

  useEffect(() => {
    if (!seen) return;
    const controller = new AbortController();
    const setState = (value: State) => setResult({ key, value });
    const params = { region, recipeId, city, batches: String(batches) };
    fetch(`/api/economy/preview?${new URLSearchParams(params)}`, { signal: controller.signal })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "Market observations unavailable.");
        setState({ status: "ready", data: preview.parse(body), fetchedAt: Date.now() });
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: e instanceof Error ? e.message : "Unavailable" });
      });
    return () => controller.abort();
  }, [seen, key, region, recipeId, city, batches]);

  const data = state.status === "ready" ? state.data : null;
  const now = state.status === "ready" ? state.fetchedAt : 0;
  const profit = data?.profit ?? null;
  const outputAge = data?.output.observedAt ? sourceAge(data.output.observedAt, now) : null;
  const gain = profit == null ? "" : profit >= 0 ? " is-gain" : " is-loss";
  return (
    <div ref={root} className="crafting-preview">
      <div className="preview-tabs is-wide" role="tablist" aria-label="Scenario">
        {(["crafting", "refining"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`${id}-${k}`}
            aria-selected={kind === k}
            onClick={() => setKind(k)}
          >
            {k === "crafting" ? "Craft item" : "Refine material"}
          </button>
        ))}
      </div>
      <div className="crafting-preview-recipe">
        <ItemIcon id={data?.recipe.output ?? chosen.output} size={48} />
        <label className="preview-select is-grow">
          <span className="sr-only">Recipe</span>
          <select
            value={recipeId}
            onChange={(e) => setRecipeIds({ ...recipeIds, [kind]: e.target.value })}
          >
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="crafting-preview-pick">
        <label className="preview-select is-grow">
          <span className="sr-only">City</span>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="preview-stepper" role="group" aria-label="Batch size">
          <button
            type="button"
            aria-label="Fewer batches"
            disabled={batches <= 1}
            onClick={() => setBatches((b) => Math.max(1, b - 1))}
          >
            <Minus size={14} />
          </button>
          <output aria-live="polite">{batches}</output>
          <button
            type="button"
            aria-label="More batches"
            disabled={batches >= 50}
            onClick={() => setBatches((b) => Math.min(50, b + 1))}
          >
            <Plus size={14} />
          </button>
          <small>{batches === 1 ? "batch" : "batches"}</small>
        </div>
      </div>

      <div className="crafting-preview-section">
        <span className="build-preview-label">Required materials</span>
        <ul className="crafting-preview-materials" aria-label="Materials">
          {(data?.rows ?? [null, null]).map((row, i) => (
            <li key={row?.id ?? i}>
              {row ? (
                <ItemIcon id={row.id} size={28} />
              ) : (
                <span className="crafting-preview-slot" />
              )}
              <span className="crafting-preview-name">
                {row ? (
                  <>
                    {row.name} <small>× {row.quantity.toLocaleString("en-US")}</small>
                  </>
                ) : (
                  "Loading materials…"
                )}
              </span>
              <span className="is-number crafting-preview-unit">
                {row?.unit != null ? silver(row.unit) : <span className="is-missing">—</span>}
              </span>
              <span className="is-number">
                {row?.gross != null ? (
                  silver(row.gross)
                ) : (
                  <span className="is-missing">{row ? "Unavailable" : "…"}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="crafting-preview-section crafting-preview-result-wrap">
        <div className="crafting-preview-result-head">
          <span className="build-preview-label">
            Cost &amp; profit{" "}
            {data
              ? `(${data.output.quantity.toLocaleString("en-US")} ${data.output.quantity === 1 ? "item" : "items"})`
              : ""}
          </span>
          {outputAge?.known && (
            <time
              dateTime={data!.output.observedAt!}
              className={outputAge.stale ? "is-stale" : undefined}
            >
              {outputAge.label}
            </time>
          )}
        </div>
        <dl className="crafting-preview-result">
          <div>
            <dt>Materials</dt>
            <dd>{data?.upfront != null ? silver(data.upfront) : "—"}</dd>
          </div>
          <div>
            <dt>Fees ({data ? `${data.assumptions.tax + data.assumptions.setupFee}%` : "—"})</dt>
            <dd>{data?.fees != null ? silver(data.fees) : "—"}</dd>
          </div>
          <div className="is-total">
            <dt>Total cost</dt>
            <dd>
              {data?.upfront != null && data.fees != null ? silver(data.upfront + data.fees) : "—"}
            </dd>
          </div>
          <div>
            <dt>Market price ({city})</dt>
            <dd>{data?.revenue != null ? silver(data.revenue) : "—"}</dd>
          </div>
          <div className={`is-strong${gain}`}>
            <dt>Profit{data && data.output.quantity > 1 ? " per item" : ""}</dt>
            <dd>
              {data?.profitPerItem != null
                ? `${data.profitPerItem < 0 ? "−" : "+"}${silver(Math.abs(data.profitPerItem))}`
                : "—"}
            </dd>
          </div>
          <div className={gain}>
            <dt>Margin</dt>
            <dd>{data?.margin != null ? `${data.margin.toFixed(1)}%` : "—"}</dd>
          </div>
        </dl>
      </div>

      {data && (
        <p className="crafting-preview-assumptions">
          <span>Assumes</span> {data.assumptions.useFocus ? "focus" : "no focus"} ·{" "}
          {data.assumptions.returnRate}% returns · {data.assumptions.tax}% tax ·{" "}
          {data.assumptions.setupFee}% setup fee
        </p>
      )}
      {data && !data.complete && (
        <PreviewStatus>
          No {data.assumptions.city} price for{" "}
          {data.missing
            .map(
              (m) =>
                data.rows.find((r) => r.id === m)?.name ??
                (m === data.recipe.output ? data.recipe.name : m),
            )
            .join(", ")}
          , so the result stays missing.
        </PreviewStatus>
      )}
      {data?.complete && profit != null && (
        <p className="landing-preview-verdict">
          {profit < 0
            ? "Buying beats making at these prices."
            : "Making beats buying at these prices."}
          {data.stale ? " Some quotes are over an hour old." : ""}
        </p>
      )}
      {state.status === "error" && <PreviewStatus>{state.message}</PreviewStatus>}
    </div>
  );
}
