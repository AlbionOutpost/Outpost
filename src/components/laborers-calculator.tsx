"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CircleCheck, RefreshCw } from "lucide-react";
import { ItemIcon } from "./item-icon";
import { Silver } from "./silver";
import { itemLabel } from "@/lib/albion/item-label";
import { useOutpostRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
import {
  initialLaborers,
  journalId,
  laborerLoot,
  laborerNames,
  laborerReturnFactor,
  laborers,
  laborerSchema,
  laborerTypes,
  laborerPriceMatches,
  type LaborerInput,
} from "@/lib/albion/laborers";
import { EditorDialog } from "./editor-dialog";
import {
  CalculatorShell,
  ResultFigure,
  ResultPair,
  ResultRows,
  useCalculatorStep,
  RetryLine,
} from "./calculator-shell";
import { PriceSource, profitTone, profitWord, Missing, PRICE_ERROR } from "./calculator-figures";
import { Disclosure } from "./disclosure";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
import s from "./calculator-shell.module.css";
import c from "@/app/calculators.module.css";
/** Silver in whole coins: the game never shows fractions of a silver. Display only. */
const whole = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? <Missing /> : <Silver value={Math.round(v)} />;
const units = (n: number | null | undefined, digits = 2) =>
  n === null || n === undefined
    ? "Unavailable"
    : n.toLocaleString("en-US", { maximumFractionDigits: digits });
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
const gathering = (type: string) =>
  ["FISHING", "WOOD", "STONE", "ORE", "FIBER", "HIDE"].includes(type) ? "Gathering" : "Crafting";
const steps = ["laborer-run", "laborer-prices", "laborer-result"];
export function LaborersCalculator() {
  const region = useOutpostRegion();
  const [draft, setDraft] = useState(() => initialLaborers(region));
  const [names, setNames] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(false);
  const [showAllLoot, setShowAllLoot] = useState(false);
  const [step, goToStep] = useCalculatorStep(steps);
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
  useEffect(
    () => () => request.current?.abort(),
    [
      region,
      draft.type,
      draft.journalTier,
      draft.journalCity,
      draft.lootCity,
      draft.saleMode,
      draft.buyOrder,
    ],
  );
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
          execution: null,
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
    setFailure("");
    try {
      const q = new URLSearchParams({
        region,
        type: requested.type,
        journalTier: String(requested.journalTier),
        journalCity: requested.journalCity,
        lootCity: requested.lootCity,
        saleMode: requested.saleMode,
        buyOrder: String(requested.buyOrder),
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
          d.saleMode !== requested.saleMode ||
          d.buyOrder !== requested.buyOrder
        )
          return d;
        const prices = { ...d.prices };
        for (const [id, p] of Object.entries(observed)) {
          if (d.prices[id]?.manual && d.prices[id]?.value !== null) continue;
          prices[id] = p;
        }
        return { ...d, prices };
      });
    } catch {
      if (!active.signal.aborted) setFailure(PRICE_ERROR);
    } finally {
      if (request.current === active) setBusy(false);
    }
  }
  // Prices for the laborer, journal tier, cities and sale mode load on their own; manual
  // prices are always kept.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => void loadRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [
    region,
    draft.type,
    draft.journalTier,
    draft.journalCity,
    draft.lootCity,
    draft.saleMode,
    draft.buyOrder,
  ]);
  const title = `${tierName[draft.journalTier]} ${laborerNames[draft.type]}`;
  const name = (id: string) => itemLabel(id, names);
  const valid = result?.valid ? result : null;
  const journalRow = (id: string, isFull: boolean) => {
    const p = draft.prices[id];
    const city = isFull ? draft.journalCity : draft.lootCity;
    const usable = laborerPriceMatches(config, id, city, isFull);
    const value = usable ? (p?.value ?? null) : null;
    const count = isFull ? draft.journals : 1;
    return (
      <li key={id} className={s.mat}>
        <ItemIcon id={id} size={40} />
        <span className={s.matName}>
          <strong>{name(id)}</strong>
          <small>
            {isFull
              ? `Full · buy ${draft.journals.toLocaleString()} in ${draft.journalCity}`
              : `Empty · sell 1 back in ${draft.lootCity}`}
          </small>
          <small>
            <PriceSource
              manual={!!p?.manual && value !== null}
              observedAt={usable && !p?.manual ? p?.observedAt : null}
              pending={busy}
            />
          </small>
        </span>
        <input
          className={s.matInput}
          aria-label={`${isFull ? "Full journal" : "Empty journal"} · ${name(id)}`}
          type="number"
          min={0}
          step="any"
          placeholder="Price"
          value={value ?? ""}
          onChange={(e) => setPrice(id, e.target.value)}
        />
        <span className={s.matTotal}>
          <span className="sr-only">Total </span>
          {value === null ? <Missing /> : whole(value * count)}
        </span>
      </li>
    );
  };
  const allRows = (
    valid ? valid.rows : loot.items.map((i) => ({ ...i, units: null, unit: null, value: null }))
  ).toSorted((a, b) => b.share - a.share);
  // The biggest shares first; the rare enchanted drops wait behind "Show all loot".
  const rows = showAllLoot ? allRows : allRows.slice(0, 5);
  const browser = (
    <div className={s.browser} aria-label="Laborer browser" role="group">
      <div className={s.browserHead}>
        <span className={s.browserCount}>{laborerTypes.length} laborers</span>
      </div>
      <div className={s.browserList}>
        {laborerTypes.map((type) => (
          <button
            key={type}
            type="button"
            aria-pressed={draft.type === type}
            onClick={() => {
              update("type", type);
              setPicker(false);
            }}
          >
            <ItemIcon id={journalId(type, draft.journalTier, true)} size={40} />
            <span>
              <strong>{laborerNames[type]}</strong>
              <small>{gathering(type)}</small>
            </span>
            {draft.type === type && <CircleCheck size={16} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  );
  const run = (
    <>
      <div className={s.identity}>
        <ItemIcon id={full} size={64} />
        <div>
          <h3>{title}</h3>
          <p>
            {gathering(draft.type)} · {units(loot.lootAmount, 4)} base loot per journal
          </p>
          <small>
            Return factor{" "}
            {laborerReturnFactor(draft.houseTier, draft.journalTier)?.toLocaleString() ??
              "unavailable"}{" "}
            in a T{draft.houseTier} house
          </small>
        </div>
        <button type="button" className="button secondary" onClick={() => setPicker(true)}>
          Change laborer
        </button>
      </div>
      <div className={s.fields}>
        <label>
          Journal tier
          <WellSelect
            value={draft.journalTier}
            onChange={(e) => update("journalTier", Number(e.target.value))}
          >
            {[4, 5, 6, 7, 8].map((t) => (
              <option key={t} value={t}>
                T{t} · {tierName[t]}
              </option>
            ))}
          </WellSelect>
        </label>
        <label>
          House tier
          <WellSelect
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
                  ? " · too low"
                  : ` · ${Math.round(laborerReturnFactor(t, draft.journalTier)! * 1000) / 10}%`}
              </option>
            ))}
          </WellSelect>
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
          <WellSelect
            value={draft.journalCity}
            onChange={(e) => update("journalCity", e.target.value as LaborerInput["journalCity"])}
          >
            {tradeCities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </WellSelect>
        </label>
        <label>
          Sell loot in
          <WellSelect
            value={draft.lootCity}
            onChange={(e) => update("lootCity", e.target.value as LaborerInput["lootCity"])}
          >
            {tradeCities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </WellSelect>
        </label>
        <label>
          Sell loot by
          <WellSelect
            value={draft.saleMode}
            onChange={(e) => update("saleMode", e.target.value as LaborerInput["saleMode"])}
          >
            <option value="instant">Buy orders</option>
            <option value="listing">My sell orders</option>
          </WellSelect>
        </label>
      </div>
      <div className={s.stack}>
        <Disclosure
          summary="Fees & empty journals"
          meta={`${draft.tax}% tax${draft.buyOrder || draft.saleMode === "listing" ? ` · ${draft.setupFee}% setup` : ""}`}
        >
          <div className={s.fields}>
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
            <label className={`${s.returns} ${s.wide}`}>
              <input
                type="checkbox"
                checked={draft.buyOrder}
                onChange={(e) => update("buyOrder", e.target.checked)}
              />
              Buy journals with a buy order (adds the setup fee)
            </label>
            <label className={`${s.returns} ${s.wide}`}>
              <input
                type="checkbox"
                checked={draft.sellEmpty}
                onChange={(e) => update("sellEmpty", e.target.checked)}
              />
              Sell one empty journal back per run
            </label>
            <p className={s.help}>
              Sales tax is 4% with Premium and 8% without. Buy and sell orders add a 2.5% setup fee.
            </p>
          </div>
        </Disclosure>
      </div>
    </>
  );
  const prices = (
    <>
      {busy ? (
        <StatusLine>Loading prices…</StatusLine>
      ) : failure ? (
        <RetryLine onRetry={load}>{failure}</RetryLine>
      ) : null}
      <div className={s.materials} role="region" aria-label="Journal and loot prices">
        <div className={s.matHead} aria-hidden="true">
          <span>Item</span>
          <span>Unit price</span>
          <span>Value</span>
        </div>
        <ul>
          {journalRow(full, true)}
          {draft.sellEmpty && journalRow(empty, false)}
          {rows.map((row) => {
            const p = draft.prices[row.id];
            return (
              <li key={row.id} className={`${s.mat} ${s.matOutput}`}>
                <ItemIcon id={row.id} size={40} />
                <span className={s.matName}>
                  <strong>{name(row.id)}</strong>
                  <small>
                    {(row.share * 100).toFixed(2)}% of loot ·{" "}
                    {row.units === null
                      ? "units unavailable"
                      : `${units(row.units, row.units < 0.1 ? 3 : 2)} expected`}
                  </small>
                  <small>
                    <PriceSource
                      manual={!!p?.manual && p.value !== null}
                      observedAt={row.unit !== null && !p?.manual ? p?.observedAt : null}
                      pending={busy}
                    />
                  </small>
                </span>
                <input
                  className={s.matInput}
                  aria-label={`${name(row.id)} unit price`}
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Price"
                  value={row.unit ?? (p?.manual ? (p.value ?? "") : "")}
                  onChange={(e) => setPrice(row.id, e.target.value)}
                />
                <span className={s.matTotal}>
                  <span className="sr-only">Value </span>
                  {row.value == null ? <Missing /> : whole(row.value)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      {allRows.length > 5 && (
        <button
          type="button"
          className={`button secondary ${c.moreLoot}`}
          aria-expanded={showAllLoot}
          onClick={() => setShowAllLoot((v) => !v)}
        >
          {showAllLoot ? "Show the main loot" : `Show all ${allRows.length} loot items`}
        </button>
      )}
      <p className={s.help}>
        Loot shares come from the game’s loot tables (27 Oct 2026). Type a price for anything the
        market hasn’t seen.
      </p>
    </>
  );
  const missing: string[] = [];
  if (valid) {
    if (valid.cost === null) missing.push("Full journal price");
    if (valid.emptyNet === null) missing.push("Empty journal price");
    if (valid.coverage < 0.999999)
      missing.push(`Loot prices (${Math.round(valid.coverage * 100)}% of the loot priced)`);
  }
  const na = (
    <span className={s.na}>
      <Unavailable />
    </span>
  );
  const profit = valid?.profit ?? null;
  const results = (
    <>
      <div className={s.resultItem}>
        <ItemIcon id={full} size={52} />
        <span>
          <strong>{title}</strong>
          <small>
            {draft.journals.toLocaleString()} full journal{draft.journals === 1 ? "" : "s"} · sell
            loot in {draft.lootCity}
          </small>
        </span>
      </div>
      {(error || (result && !result.valid)) && (
        <p role="alert" className={s.alert}>
          {error || (result && !result.valid ? result.reason : "")}
        </p>
      )}
      <ResultFigure
        label={valid && !valid.complete && profit !== null ? "Profit, at least" : "Expected profit"}
        tone={profit === null ? "even" : profitTone(profit)}
        value={
          <output aria-label="Expected profit" data-result="laborer-profit">
            {profit === null ? <Missing /> : whole(profit)}
          </output>
        }
        note={
          profit === null
            ? busy
              ? "Loading prices…"
              : "Price the journals and loot to see your profit"
            : valid!.complete
              ? `${profitWord(profit)} for ${draft.journals.toLocaleString()} journal${draft.journals === 1 ? "" : "s"}`
              : "Some loot isn’t priced yet; it can only add to this"
        }
        aside={{
          label: "Return on cost",
          value: valid?.roi == null ? <Missing /> : `${valid.roi.toFixed(1)}%`,
        }}
      />
      <ResultPair
        result="laborer-cash"
        items={[
          { label: "Journals cost", value: valid?.cost == null ? na : whole(valid.cost) },
          {
            label: "Loot after fees",
            value: valid && valid.coverage > 0 ? whole(valid.lootNet) : na,
          },
        ]}
      />
      {valid && missing.length > 0 && (
        <div className={s.readiness} data-result="readiness" role="status">
          <strong>
            {missing.length} {missing.length === 1 ? "price" : "prices"} to go
          </strong>
          <ul>
            {missing.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <button type="button" className="button secondary" onClick={() => goToStep(2)}>
            Add prices <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {valid?.stale && (
        <StatusLine tone="stale">
          Includes prices over an hour old. Refresh before you buy.
        </StatusLine>
      )}
      {valid && (
        <ResultRows
          result="laborer-rows"
          items={[
            { label: "Loot units", value: units(valid.totalUnits) },
            ...(draft.sellEmpty
              ? [
                  {
                    label: "Empty journal after fees",
                    value: valid.emptyNet == null ? <Unavailable /> : whole(valid.emptyNet),
                  },
                ]
              : []),
          ]}
        />
      )}
      <p className={s.resultNote}>
        Loot is the average of the loot table; a single run lands above or below it.
      </p>
    </>
  );
  return (
    <div className={s.journey}>
      {picker && (
        <EditorDialog open title="Choose a laborer" drawer onClose={() => setPicker(false)}>
          {browser}
        </EditorDialog>
      )}
      <CalculatorShell
        label="Laborer workflow"
        step={step}
        onStep={goToStep}
        summary={{
          label: "Expected profit",
          tone: profit === null ? "even" : profitTone(profit),
          value:
            profit === null ? (
              <span className={s.summaryPending}>
                {missing.length
                  ? `${missing.length} ${missing.length === 1 ? "price" : "prices"} to go`
                  : "Unavailable"}
              </span>
            ) : (
              whole(profit)
            ),
        }}
        steps={[
          {
            id: steps[0],
            label: "Set up run",
            title: "Laborer and journals",
            line: "Who works, which journals, and where you buy and sell.",
            children: run,
          },
          {
            id: steps[1],
            label: "Price loot",
            title: "Prices",
            line: `Journals in ${draft.journalCity} · loot in ${draft.lootCity}. Type any price to override it.`,
            actions: (
              <button
                type="button"
                className={`button secondary ${s.refresh}`}
                aria-label="Refresh market prices"
                aria-busy={busy}
                disabled={busy}
                onClick={load}
              >
                <RefreshCw size={15} aria-hidden="true" />
                {busy ? "Updating…" : "Refresh"}
              </button>
            ),
            children: prices,
          },
          {
            id: steps[2],
            label: "Review profit",
            title: "Profit",
            children: results,
          },
        ]}
      />
    </div>
  );
}
