"use client";
import { useEffect, useRef, useState } from "react";
import { Hammer } from "lucide-react";
import { CalculationReadiness } from "./calculation-readiness";
import { ItemIcon } from "./item-icon";
import { useAtlasRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
import {
  initialLaborers,
  journalId,
  laborerLoot,
  laborerNames,
  laborerReturnFactor,
  laborers,
  laborerSchema,
  laborerSource,
  laborerTypes,
  type LaborerInput,
} from "@/lib/albion/laborers";
import "@/app/tool-workspace.css";
const money = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined
    ? "—"
    : n.toLocaleString(undefined, { maximumFractionDigits: digits });
const tradeCities = cities.filter((c) => c !== "Black Market");
const tierName = [
  "",
  "",
  "Novice",
  "Journeyman",
  "Adept",
  "Expert",
  "Master",
  "Grandmaster",
  "Elder",
];
export function LaborersCalculator() {
  const region = useAtlasRegion();
  const [draft, setDraft] = useState(() => initialLaborers(region));
  const [names, setNames] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const config = { ...draft, region };
  const loot = laborerLoot(draft.type, draft.journalTier)!;
  const full = journalId(draft.type, draft.journalTier, true);
  const empty = journalId(draft.type, draft.journalTier, false);
  const ids = [full, empty, ...loot.items.map((i) => i.id)];
  const idsKey = ids.join(",");
  useEffect(() => {
    const active = new AbortController();
    fetch(`/api/items/game?ids=${encodeURIComponent(idsKey)}`, { signal: active.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { items: Record<string, { name: string }> } | null) => {
        if (b)
          setNames((n) => ({
            ...n,
            ...Object.fromEntries(Object.entries(b.items).map(([k, v]) => [k, v.name])),
          }));
      })
      .catch(() => {});
    return () => active.abort();
  }, [idsKey]);
  useEffect(() => () => request.current?.abort(), []);
  let result: ReturnType<typeof laborers> | null = null;
  let error = "";
  try {
    result = laborers(config);
  } catch {
    error = "Check journals, fees and prices.";
  }
  const update = <K extends keyof LaborerInput>(key: K, value: LaborerInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  function setPrice(id: string, value: string) {
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
          quality: 1,
        },
      },
    }));
  }
  async function load() {
    request.current?.abort();
    const active = new AbortController();
    request.current = active;
    const requested = config;
    setBusy(true);
    setMessage("");
    try {
      const q = new URLSearchParams({
        region,
        type: requested.type,
        journalTier: String(requested.journalTier),
        journalCity: requested.journalCity,
        lootCity: requested.lootCity,
        saleMode: requested.saleMode,
      });
      const r = await fetch(`/api/laborers/prices?${q}`, {
        signal: AbortSignal.any([active.signal, AbortSignal.timeout(15000)]),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error);
      const observed = laborerSchema.shape.prices.parse(b.prices);
      if (active.signal.aborted) return;
      setDraft((d) => {
        if (
          d.type !== requested.type ||
          d.journalTier !== requested.journalTier ||
          d.journalCity !== requested.journalCity ||
          d.lootCity !== requested.lootCity ||
          d.saleMode !== requested.saleMode
        )
          return d;
        const prices = { ...d.prices };
        for (const [id, p] of Object.entries(observed)) {
          if (d.prices[id]?.manual && d.prices[id]?.value !== null) continue;
          prices[id] = p;
        }
        return { ...d, prices };
      });
      setMessage("Observed prices loaded. Your manual prices were kept; missing ones show a dash.");
    } catch (e) {
      if (!active.signal.aborted) setMessage(e instanceof Error ? e.message : "Prices unavailable");
    } finally {
      if (request.current === active) setBusy(false);
    }
  }
  const priceInput = (id: string, label: string, city: string) => {
    const p = draft.prices[id];
    const usable = p && p.value !== null && (p.manual || (p.region === region && p.city === city));
    return (
      <label className="tool-price-field">
        {label}
        <input
          type="number"
          min={0}
          step="any"
          placeholder="Unavailable"
          value={usable ? (p.value ?? "") : ""}
          onChange={(e) => setPrice(id, e.target.value)}
        />
        <small>
          {!usable
            ? "No observation · enter a price"
            : p.manual
              ? "Manual price"
              : `${city} · ${p.observedAt ? `${p.observedAt.replace("T", " ").slice(0, 16)} UTC` : "unknown time"}`}
        </small>
      </label>
    );
  };
  const missing: string[] = [];
  if (result?.valid) {
    if (result.cost === null) missing.push("Full journal price");
    if (result.emptyNet === null) missing.push("Empty journal price");
    if (result.coverage < 0.999999)
      missing.push(`Loot prices (${Math.round(result.coverage * 100)}% of the loot table priced)`);
  }
  return (
    <div className="tool-workspace">
      <aside className="panel tool-library" aria-label="Laborer types">
        <h2>Laborers</h2>
        <div className="tool-library-list">
          {laborerTypes.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={draft.type === type}
              onClick={() => update("type", type)}
            >
              <ItemIcon id={journalId(type, draft.journalTier, true)} size={36} />
              <span>
                {laborerNames[type]}
                <small>
                  {type === "FISHING" || ["WOOD", "STONE", "ORE", "FIBER", "HIDE"].includes(type)
                    ? "Gathering"
                    : "Crafting"}
                </small>
              </span>
            </button>
          ))}
        </div>
      </aside>
      <div className="tool-inputs">
        <section className="panel">
          <div className="tool-identity">
            <ItemIcon id={full} size={64} />
            <div>
              <p className="eyebrow">Laborer run</p>
              <h2>
                {tierName[draft.journalTier]} {laborerNames[draft.type]}
              </h2>
              <p>
                {money(loot.lootAmount, 4)} base loot per full journal · return factor{" "}
                {laborerReturnFactor(draft.houseTier, draft.journalTier)?.toLocaleString() ?? "—"}
              </p>
            </div>
          </div>
          <div className="input-grid">
            <label>
              Journal tier
              <select
                value={draft.journalTier}
                onChange={(e) => update("journalTier", Number(e.target.value))}
              >
                {[4, 5, 6, 7, 8].map((t) => (
                  <option key={t} value={t}>
                    T{t} · {tierName[t]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              House tier
              <select
                value={draft.houseTier}
                onChange={(e) => update("houseTier", Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((t) => (
                  <option
                    key={t}
                    value={t}
                    disabled={laborerReturnFactor(t, draft.journalTier) === null}
                  >
                    T{t}
                    {laborerReturnFactor(t, draft.journalTier) === null
                      ? " · not allowed"
                      : ` · ${Math.round(laborerReturnFactor(t, draft.journalTier)! * 1000) / 10}%`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Full journals
              <input
                type="number"
                min={1}
                max={10000}
                value={draft.journals}
                onChange={(e) => update("journals", Number(e.target.value))}
              />
            </label>
            <label>
              Buy journals in
              <select
                value={draft.journalCity}
                onChange={(e) =>
                  update("journalCity", e.target.value as LaborerInput["journalCity"])
                }
              >
                {tradeCities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Sell loot in
              <select
                value={draft.lootCity}
                onChange={(e) => update("lootCity", e.target.value as LaborerInput["lootCity"])}
              >
                {tradeCities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Sell loot by
              <select
                value={draft.saleMode}
                onChange={(e) => update("saleMode", e.target.value as LaborerInput["saleMode"])}
              >
                <option value="instant">Selling to buy orders</option>
                <option value="listing">Sell orders (listing)</option>
              </select>
            </label>
          </div>
          <details className="economy-assumptions">
            <summary>Fees & empty journals</summary>
            <div className="input-grid">
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
                Setup fee (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={draft.setupFee}
                  onChange={(e) => update("setupFee", Number(e.target.value))}
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={draft.buyOrder}
                  onChange={(e) => update("buyOrder", e.target.checked)}
                />
                Buy journals with a buy order (adds the setup fee)
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={draft.sellEmpty}
                  onChange={(e) => update("sellEmpty", e.target.checked)}
                />
                Count resale of one empty journal per run
              </label>
            </div>
            <p className="muted">
              Premium: 4% sales tax, otherwise 8%. Sell orders and buy orders also pay a 2.5% setup
              fee.
            </p>
          </details>
        </section>
        <section className="panel">
          <div className="tool-section-heading">
            <h2>Prices</h2>
            <button className="button secondary" type="button" disabled={busy} onClick={load}>
              {busy ? "Loading…" : "Load market prices"}
            </button>
          </div>
          <p role="status" className="muted">
            {message}
          </p>
          <div className="input-grid">
            {priceInput(full, `Full journal · ${names[full] ?? full}`, draft.journalCity)}
            {draft.sellEmpty &&
              priceInput(empty, `Empty journal · ${names[empty] ?? empty}`, draft.lootCity)}
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Expected laborer loot"
          >
            <table className="tool-table">
              <thead>
                <tr>
                  <th scope="col">Loot</th>
                  <th scope="col" className="numeric">
                    Share
                  </th>
                  <th scope="col" className="numeric">
                    Expected units
                  </th>
                  <th scope="col">Unit price · silver</th>
                  <th scope="col" className="numeric">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {(result?.valid
                  ? result.rows
                  : loot.items.map((i) => ({ ...i, units: null, unit: null, value: null }))
                ).map((row) => {
                  const p = draft.prices[row.id];
                  return (
                    <tr key={row.id}>
                      <th scope="row">
                        <span className="tool-item-cell">
                          <ItemIcon id={row.id} size={32} />
                          {names[row.id] ?? row.id}
                        </span>
                      </th>
                      <td className="numeric">{(row.share * 100).toFixed(2)}%</td>
                      <td className="numeric">
                        {money(row.units, row.units !== null && row.units < 0.1 ? 3 : 2)}
                      </td>
                      <td>
                        <input
                          aria-label={`${names[row.id] ?? row.id} unit price`}
                          type="number"
                          min={0}
                          step="any"
                          placeholder="Unavailable"
                          value={row.unit ?? (p?.manual ? (p.value ?? "") : "")}
                          onChange={(e) => setPrice(row.id, e.target.value)}
                        />
                      </td>
                      <td className="numeric">{money(row.value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <aside className="panel tool-results" aria-labelledby="laborer-results-title">
        <Hammer size={22} aria-hidden="true" />
        <h2 id="laborer-results-title">Expected profit</h2>
        {error ? (
          <p role="alert">{error}</p>
        ) : !result?.valid ? (
          <p role="alert">{result?.reason}</p>
        ) : (
          <>
            <output
              className={`tool-main-result ${result.profit !== null && result.profit < 0 ? "negative" : ""}`}
            >
              {result.profit === null
                ? "—"
                : `${result.complete ? "" : "≥ "}${money(result.profit)}`}
              <small> silver</small>
            </output>
            <CalculationReadiness
              title={result.complete ? "All prices in place" : "Estimate is incomplete"}
              missing={missing}
            >
              {result.stale ? "Some observations are more than an hour old." : undefined}
            </CalculationReadiness>
            <dl>
              <div>
                <dt>Loot units</dt>
                <dd>{money(result.totalUnits, 2)}</dd>
              </div>
              <div>
                <dt>Loot value after fees</dt>
                <dd>{result.coverage > 0 ? money(result.lootNet) : "—"}</dd>
              </div>
              {draft.sellEmpty && (
                <div>
                  <dt>Empty journals after fees</dt>
                  <dd>{money(result.emptyNet)}</dd>
                </div>
              )}
              <div>
                <dt>Full journals cost</dt>
                <dd>{money(result.cost)}</dd>
              </div>
              <div>
                <dt>Margin</dt>
                <dd>{result.margin === null ? "—" : `${result.margin.toFixed(1)}%`}</dd>
              </div>
            </dl>
            <p className="muted">
              Loot is an expected value from the weighted loot table; a single run can land above or
              below it. Unpriced loot counts as zero, so an incomplete result is a lower bound.{" "}
              {laborerSource}.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
