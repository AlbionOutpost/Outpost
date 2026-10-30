"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ItemIcon } from "@/components/item-icon";
import { useAtlasRegion } from "@/components/region-context";
import { sourceAge } from "@/lib/albion/source-age";
import { PreviewStatus } from "./preview-shell";

const preview = z.object({
  recipe: z.object({ id: z.string(), name: z.string(), output: z.string() }),
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
  margin: z.number().nullable(),
});
type Preview = z.infer<typeof preview>;
type State =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Preview; fetchedAt: number };

const silver = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * One real crafting scenario run through the production service with current observations.
 * The assumptions are shown next to the result; a missing price leaves the result missing.
 */
export function CraftingPreview({
  recipeId,
  outputName,
  city,
}: {
  recipeId: string;
  outputName: string;
  city: string;
}) {
  const region = useAtlasRegion();
  const root = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [result, setResult] = useState<{ key: string; value: State } | null>(null);
  const key = `${region}:${recipeId}:${city}`;
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
    fetch(`/api/economy/preview?${new URLSearchParams({ region, recipeId, city })}`, {
      signal: controller.signal,
    })
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
  }, [seen, key, region, recipeId, city]);

  const data = state.status === "ready" ? state.data : null;
  const now = state.status === "ready" ? state.fetchedAt : 0;
  const output = data?.recipe.output ?? "";
  const profit = data?.profit ?? null;
  return (
    <div ref={root} className="crafting-preview">
      <div className="crafting-preview-recipe">
        {output ? <ItemIcon id={output} size={44} /> : <span className="crafting-preview-slot" />}
        <div>
          <strong>{data?.recipe.name ?? outputName}</strong>
          <span>
            Crafted and sold in {city} · {data?.assumptions.batches ?? 1} batch
          </span>
        </div>
      </div>
      <ul className="crafting-preview-materials" aria-label="Materials">
        {(data?.rows ?? [null, null]).map((row, i) => {
          const age = row ? sourceAge(row.observedAt, now) : null;
          return (
            <li key={row?.id ?? i} className={row ? undefined : "is-loading"}>
              {row ? (
                <ItemIcon id={row.id} size={28} />
              ) : (
                <span className="crafting-preview-slot" />
              )}
              <span className="crafting-preview-name">
                {row ? (
                  <>
                    {row.name} <small>× {row.quantity}</small>
                  </>
                ) : (
                  "Loading materials…"
                )}
              </span>
              <span className="is-number">
                {row?.gross != null ? (
                  silver(row.gross)
                ) : (
                  <span className="is-missing">{row ? "— Unavailable" : "…"}</span>
                )}
              </span>
              {age?.known && (
                <time dateTime={row!.observedAt!} className={age.stale ? "is-stale" : undefined}>
                  {age.label}
                </time>
              )}
            </li>
          );
        })}
      </ul>
      <dl className="crafting-preview-result">
        <div>
          <dt>Materials</dt>
          <dd>{data?.upfront != null ? silver(data.upfront) : "—"}</dd>
        </div>
        <div>
          <dt>Sells for</dt>
          <dd>
            {data?.output.unit != null ? silver(data.output.unit) : "—"}
            {data?.output.observedAt && (
              <small className={sourceAge(data.output.observedAt, now).stale ? "is-stale" : ""}>
                {sourceAge(data.output.observedAt, now).label}
              </small>
            )}
          </dd>
        </div>
        <div className={profit == null ? "" : profit >= 0 ? "is-gain" : "is-loss"}>
          <dt>Profit after fees</dt>
          <dd>{profit != null ? `${profit < 0 ? "−" : "+"}${silver(Math.abs(profit))}` : "—"}</dd>
        </div>
      </dl>
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
              (id) =>
                data.rows.find((r) => r.id === id)?.name ?? (id === output ? data.recipe.name : id),
            )
            .join(", ")}
          , so the result stays missing.
        </PreviewStatus>
      )}
      {data?.complete && profit != null && (
        <p className="landing-preview-verdict">
          {profit < 0
            ? "Buying beats crafting at these prices."
            : "Crafting beats buying at these prices."}
          {data.stale ? " Some quotes are over an hour old." : ""}
        </p>
      )}
      {state.status === "error" && <PreviewStatus>{state.message}</PreviewStatus>}
    </div>
  );
}
