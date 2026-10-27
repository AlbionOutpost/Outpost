"use client";
import { useState } from "react";
import { useAtlasRegion } from "./region-context";
import {
  initialTransport,
  transport,
  transportSchema,
  type TransportInput,
} from "@/lib/albion/transport";
import { cities } from "@/lib/albion/region-config";
export function TransportCalculator() {
  const region = useAtlasRegion(),
    [draft, setDraft] = useState(() => initialTransport(region)),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [title, setTitle] = useState(""),
    [saved, setSaved] = useState<{ id: string; title: string; configuration: unknown }[]>([]);
  const config = { ...draft, region };
  let result: ReturnType<typeof transport> | null = null;
  try {
    result = transport(config);
  } catch {}
  const update = <K extends keyof TransportInput>(k: K, value: TransportInput[K]) =>
    setDraft((d) => ({ ...d, [k]: value }));
  const money = (n: number | null | undefined) =>
    n === null || n === undefined
      ? "Unavailable"
      : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  async function load() {
    setBusy(true);
    try {
      const q = new URLSearchParams({
        region,
        itemId: draft.itemId,
        quality: String(draft.quality),
        fromCity: draft.fromCity,
        toCity: draft.toCity,
        saleMode: draft.saleMode,
      });
      const r = await fetch(`/api/transport/prices?${q}`),
        b = await r.json();
      if (!r.ok) throw new Error(b.error);
      const buy = transportSchema.shape.buy.parse(b.buy),
        sell = transportSchema.shape.sell.parse(b.sell);
      setDraft((d) => ({ ...d, buy, sell }));
      setMessage("Loaded actual source observations. Missing orders remain unavailable.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Price service unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="calculator-grid">
        <div className="calculator-inputs">
          <section className="panel">
            <h2>Route & cargo</h2>
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
                    {cities.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              ))}
              <label>
                Sale execution
                <select
                  value={draft.saleMode}
                  onChange={(e) => update("saleMode", e.target.value as TransportInput["saleMode"])}
                >
                  <option value="instant">Sell to observed buy order</option>
                  <option value="listing">Estimate a player sell listing</option>
                </select>
              </label>
              <label>
                Transport quality
                <select
                  value={draft.quality}
                  onChange={(e) => setDraft((d) => ({ ...d, quality: Number(e.target.value) }))}
                >
                  {[1, 2, 3, 4, 5].map((q) => (
                    <option key={q}>{q}</option>
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
                    value={Number.isNaN(draft[key]) ? "" : draft[key]}
                    onChange={(e) =>
                      update(key, e.target.value === "" ? NaN : Number(e.target.value))
                    }
                  />
                </label>
              ))}
            </div>
            <p className="muted">
              Capacity, item weight, fees and risk are manual assumptions. Trips = ceiling(total
              weight / available capacity), minimum one. This model does not simulate mount skills,
              route safety, liquidity, volume limits or order execution.
            </p>
          </section>
          <section className="panel section">
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
                    value={draft[key].value ?? ""}
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
          <div className="eyebrow">TRANSPORT NET PROFIT</div>
          <strong
            key={result?.profit ?? "empty"}
            className={`value-update${(result?.profit ?? 0) < 0 ? " negative" : ""}`}
          >
            {money(result?.profit)}
          </strong>
          {!result && (
            <p role="alert">
              Check item ID, quantities, capacity, fees and market mode. Black Market uses buy
              orders only.
            </p>
          )}
          {result && !result.complete && (
            <p role="status">Missing or mismatched prices. Enter overrides or load observations.</p>
          )}
          {result?.stale && <p className="error">Stale source observations included.</p>}
          <dl>
            {[
              ["Cargo weight", result?.totalWeight],
              ["Estimated trips", result?.trips],
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
              setBusy(true);
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
                setBusy(false);
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
