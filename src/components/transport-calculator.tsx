"use client";
import { useState, useEffect, useRef } from "react";
import { useAtlasRegion } from "./region-context";
import {
  initialTransport,
  transport,
  transportSchema,
  transportPriceMatches,
  type TransportInput,
} from "@/lib/albion/transport";
import { cities } from "@/lib/albion/region-config";
import { CatalogItemPicker } from "./catalog-item-picker";
import { ItemIcon } from "./item-icon";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { ArrowRight, Truck } from "lucide-react";
import { transportPriceQuery, mergeTransportObservations } from "@/lib/albion/transport-prices";
export function TransportCalculator() {
  const region = useAtlasRegion(),
    [draft, setDraft] = useState(() => initialTransport(region)),
    [message, setMessage] = useState(""),
    [pendingKey, setPendingKey] = useState<string | null>(null),
    [title, setTitle] = useState(""),
    [saved, setSaved] = useState<{ id: string; title: string; configuration: unknown }[]>([]);
  const config = { ...draft, region };
  const requestKey = transportPriceQuery(config),
    busy = pendingKey === requestKey;
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), [requestKey]);
  let result: ReturnType<typeof transport> | null = null;
  let validationError = "";
  try {
    result = transport(config);
  } catch {
    validationError = "Check cargo quantity, positive capacity, prices and cost limits.";
  }
  const update = <K extends keyof TransportInput>(k: K, value: TransportInput[K]) =>
    setDraft((d) => ({ ...d, [k]: value }));
  const money = (n: number | null | undefined) =>
    n === null || n === undefined
      ? "Unavailable"
      : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  async function load() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const requested = config;
    setPendingKey(requestKey);
    try {
      const q = transportPriceQuery(requested);
      const r = await fetch(`/api/transport/prices?${q}`, {
          signal: AbortSignal.any([active.signal, AbortSignal.timeout(15000)]),
        }),
        b = await r.json();
      if (!r.ok) throw new Error(b.error);
      const buy = transportSchema.shape.buy.parse(b.buy),
        sell = transportSchema.shape.sell.parse(b.sell);
      if (active.signal.aborted) return;
      setDraft((d) => mergeTransportObservations({ ...d, region }, requested, { buy, sell }));
      setMessage("Loaded actual source observations. Missing orders remain unavailable.");
    } catch (e) {
      if (!active.signal.aborted)
        setMessage(e instanceof Error ? e.message : "Price service unavailable");
    } finally {
      if (controller.current === active) setPendingKey(null);
    }
  }
  return (
    <>
      <div className="transport-route-strip" aria-label="Transport route">
        <Truck size={20} aria-hidden="true" />
        <span>
          <small>Purchase market</small>
          <strong>{draft.fromCity}</strong>
        </span>
        <ArrowRight size={18} aria-hidden="true" />
        <span>
          <small>Destination market</small>
          <strong>{draft.toCity}</strong>
        </span>
        <span className="transport-route-region">
          {region} · {draft.saleMode === "instant" ? "Sell to buy orders" : "Sell listing estimate"}
        </span>
        <div className="transport-route-profit" aria-live="polite">
          <small>Estimated net profit{result?.stale ? " · stale prices" : ""}</small>
          {validationError ? (
            <span>{validationError}</span>
          ) : result?.complete ? (
            <strong className={result.profit! < 0 ? "negative" : "positive"}>
              {money(result.profit)} silver
            </strong>
          ) : (
            <a className="text-link" href="#transport-prices">
              Add purchase & sale prices
            </a>
          )}
        </div>
      </div>
      <div className="calculator-grid transport-workspace">
        <div className="calculator-inputs">
          <section className="panel">
            <h2>Route & cargo</h2>
            <CatalogItemPicker
              label="Find transport cargo"
              onSelect={(item) => update("itemId", item.id)}
            />
            <div className="transport-item-identity">
              <ItemIcon id={draft.itemId} quality={draft.quality} size={56} />
              <div>
                <strong>{equipmentName(draft.itemId)}</strong>
                <small>Selected cargo · weight is entered below</small>
              </div>
            </div>
            <label>
              Transport item identifier
              <input
                value={draft.itemId}
                maxLength={100}
                onChange={(e) => update("itemId", e.target.value.toUpperCase())}
              />
            </label>
            <div className="input-grid">
              {(
                [
                  ["fromCity", "Purchase market"],
                  ["toCity", "Destination market"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <select
                    value={draft[key]}
                    onChange={(e) => update(key, e.target.value as TransportInput[typeof key])}
                  >
                    {cities
                      .filter((c) => key !== "fromCity" || c !== "Black Market")
                      .map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                  </select>
                </label>
              ))}
              <label>
                Sale execution
                <select
                  aria-label="Sale execution"
                  value={draft.saleMode}
                  onChange={(e) => update("saleMode", e.target.value as TransportInput["saleMode"])}
                >
                  <option value="instant">Sell to observed buy order</option>
                  <option value="listing">Estimate a sell listing</option>
                </select>
              </label>
              <label>
                Transport quality
                <select
                  value={draft.quality}
                  onChange={(e) => setDraft((d) => ({ ...d, quality: Number(e.target.value) }))}
                >
                  {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"].map((q, i) => (
                    <option key={q} value={i + 1}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="input-grid">
              {(
                [
                  ["quantity", "Cargo quantity"],
                  ["weight", "Weight per item (kg)"],
                  ["capacity", "Available cargo capacity (kg)"],
                  ["costPerTrip", "Cost per trip"],
                  ["risk", "Total manual risk allowance"],
                  ["tax", "Transport sales tax (%)"],
                  ["fee", "Transport listing fee (%)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    min={key === "quantity" || key === "capacity" ? 1 : 0}
                    step="any"
                    disabled={key === "fee" && draft.saleMode === "instant"}
                    value={Number.isNaN(draft[key]) ? "" : draft[key]}
                    onChange={(e) =>
                      update(key, e.target.value === "" ? NaN : Number(e.target.value))
                    }
                  />
                </label>
              ))}
            </div>
            <p className="muted">
              Listing fees apply only to sell listings, not instant sales. Black Market listings
              need a manual target price. Capacity, item weight, fees and risk are manual
              assumptions. Trips = ceiling(total weight / available capacity), minimum one. This
              model does not simulate mount skills, route safety, liquidity, volume limits or order
              execution.
            </p>
          </section>
          <section className="panel section" id="transport-prices">
            <h2>Purchase & sale observations</h2>
            <button className="button secondary" disabled={busy} onClick={load}>
              Load transport market prices
            </button>
            <p className="muted">
              Loading replaces both price overrides with source observations. Region: {region}.
            </p>
            <div className="input-grid">
              {(["buy", "sell"] as const).map((key) => (
                <label key={key}>
                  {key === "buy" ? "Transport purchase unit price" : "Transport sale unit price"}
                  <input
                    type="number"
                    min={0}
                    aria-label={
                      key === "buy" ? "Transport purchase unit price" : "Transport sale unit price"
                    }
                    value={transportPriceMatches(config, key) ? (draft[key].value ?? "") : ""}
                    onChange={(e) =>
                      update(key, {
                        ...draft[key],
                        value: e.target.value === "" ? null : Number(e.target.value),
                        manual: true,
                        quality: draft.quality,
                      })
                    }
                  />
                  <small>
                    {draft[key].manual
                      ? "Manual assumption"
                      : `${draft[key].region} · ${draft[key].city} · ${draft[key].observedAt || "Unavailable"}`}
                  </small>
                </label>
              ))}
            </div>
          </section>
        </div>
        <section className="panel result">
          <h2>Transport net profit</h2>
          {result?.complete ? (
            <>
              <strong
                className={
                  result?.profit == null || result.profit === 0
                    ? "neutral"
                    : result.profit < 0
                      ? "negative"
                      : "positive"
                }
              >
                {money(result?.profit)}
              </strong>
              <p className="result-unit">silver after configured costs and fees</p>
            </>
          ) : (
            <div className="transport-initial-state" role="status">
              <Truck size={28} aria-hidden="true" />
              <h3>Price your cargo</h3>
              <p>
                Choose an item and route, then load observations or enter purchase and sale prices.
                Your profit will appear here.
              </p>
              <a className="button secondary" href="#transport-prices">
                Enter cargo prices <ArrowRight size={15} />
              </a>
            </div>
          )}
          {result && (
            <div className="cargo-capacity-summary">
              <div>
                <span>Cargo weight</span>
                <strong>{money(result.totalWeight)} kg</strong>
              </div>
              <div>
                <span>Available capacity / trip</span>
                <strong>{money(draft.capacity)} kg</strong>
              </div>
              <div>
                <span>Trips required</span>
                <strong>{result.trips.toLocaleString()}</strong>
              </div>
            </div>
          )}
          {!result && (
            <p role="alert">
              Check item ID, quantities, capacity, fees and market mode. Black Market uses buy
              orders only.
            </p>
          )}
          {result?.stale && <p className="error">Stale source observations included.</p>}
          {result?.complete && (
            <dl>
              {[
                ["Transport and risk costs", result?.transportCost],
                ["Total cost", result?.cost],
                ["Revenue", result?.revenue],
                ["Taxes and listing fees", result?.fees],
                ["ROI (%)", result?.roi],
                ["Margin (%)", result?.margin],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt>{label}</dt>
                  <dd>{money(value as number | null)}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>
      <section className="panel section">
        <h2>Saved transport plans</h2>
        <label>
          Transport plan title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        </label>
        <div className="actions">
          <button
            className="button secondary"
            disabled={busy || !transportSchema.safeParse(config).success}
            onClick={async () => {
              controller.current?.abort();
              const active = new AbortController();
              controller.current = active;
              setPendingKey(requestKey);
              try {
                const r = await fetch("/api/scenarios", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: title || "Transport plan",
                      configuration: config,
                    }),
                  }),
                  b = await r.json();
                if (!r.ok) throw new Error(b.error);
                setMessage("Transport plan saved to your account.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Save failed");
              } finally {
                if (controller.current === active) setPendingKey(null);
              }
            }}
          >
            Save transport plan
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={async () => {
              try {
                const r = await fetch("/api/scenarios?kind=transporting"),
                  b = await r.json();
                if (!r.ok) throw new Error(b.error);
                setSaved(b.filter((s: { kind: string }) => s.kind === "transporting"));
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Load failed");
              }
            }}
          >
            Load transport plans
          </button>
        </div>
        {saved.map((s) => (
          <div className="group-member" key={s.id}>
            <span>{s.title}</span>
            <button
              className="button secondary"
              onClick={() => {
                const p = transportSchema.safeParse(s.configuration);
                if (p.success) {
                  setDraft({ ...p.data, region });
                  setMessage(
                    `Restored ${s.title}. Current header region applies; refresh mismatched source prices.`,
                  );
                } else setMessage("This saved plan is invalid.");
              }}
            >
              Restore {s.title}
            </button>
            <button
              className="button secondary"
              onClick={async () => {
                const r = await fetch(`/api/scenarios/${s.id}`, { method: "DELETE" });
                if (r.ok) {
                  setSaved(saved.filter((v) => v.id !== s.id));
                  setMessage("Transport plan deleted.");
                } else setMessage("Delete failed.");
              }}
            >
              Delete {s.title}
            </button>
          </div>
        ))}
        <p role="status">{message}</p>
      </section>
    </>
  );
}
