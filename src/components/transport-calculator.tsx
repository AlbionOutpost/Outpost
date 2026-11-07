"use client";
import { AnimatedNumber } from "./animated-number";
import { AccountPageMore, appendAccountRows } from "./account-page-more";
import { useState, useEffect, useRef } from "react";
import { useOutpostRegion } from "./region-context";
import {
  initialTransport,
  transport,
  transportSchema,
  transportPriceMatches,
  type TransportInput,
} from "@/lib/albion/transport";
import { cities, type Region } from "@/lib/albion/region-config";
import { CatalogItemPicker } from "./catalog-item-picker";
import { ItemIcon } from "./item-icon";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { ArrowRight, RefreshCw } from "lucide-react";
import { transportPriceQuery, mergeTransportObservations } from "@/lib/albion/transport-prices";
import { mounts, mountCapacity } from "@/lib/albion/mounts";
import {
  CalculatorShell,
  ResultFigure,
  ResultPair,
  ResultRows,
  useCalculatorStep,
  RetryLine,
} from "./calculator-shell";
import {
  coin,
  PriceSource,
  profitTone,
  profitWord,
  Missing,
  PRICE_ERROR,
} from "./calculator-figures";
import { Disclosure } from "./disclosure";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
import s from "./calculator-shell.module.css";
import c from "@/app/calculators.module.css";
import { NumberField } from "./number-field";
export type TransportPreselection = {
  item?: string;
  from?: string;
  to?: string;
  quality?: string;
};
const qualities = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];
/** Links from the flip scanner and item pages preselect cargo, route and quality. */
function preselected(region: Region, initial: TransportPreselection) {
  const base = initialTransport(region);
  const item = (initial.item || "").toUpperCase(),
    quality = Number(initial.quality || 0);
  const city = (name?: string) => cities.find((c) => c === name);
  return {
    ...base,
    ...(/^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/.test(item) ? { itemId: item } : {}),
    ...(city(initial.from) && initial.from !== "Black Market"
      ? { fromCity: city(initial.from)! }
      : {}),
    ...(city(initial.to) ? { toCity: city(initial.to)! } : {}),
    ...(quality >= 1 && quality <= 5 ? { quality } : {}),
  };
}
const steps = ["transport-route", "transport-prices", "transport-result"];
export function TransportCalculator({ initial = {} }: { initial?: TransportPreselection }) {
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const region = useOutpostRegion(),
    [draft, setDraft] = useState(() => preselected(region, initial)),
    [priceMessage, setPriceMessage] = useState<{ text: string; error: boolean } | null>(null),
    [message, setMessage] = useState(""),
    [pendingKey, setPendingKey] = useState<string | null>(null),
    [title, setTitle] = useState(""),
    [saved, setSaved] = useState<{ id: string; title: string; configuration: unknown }[]>([]);
  const [gameWeight, setGameWeight] = useState<{ id: string; weight: number | null } | null>(null);
  const [mount, setMount] = useState({ id: "", quality: 1 });
  const [step, goToStep] = useCalculatorStep(steps);
  const autoWeight = useRef<number | null>(null);
  // Fill the per-item weight from game data whenever the cargo changes.
  useEffect(() => {
    if (!/^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/.test(draft.itemId)) return;
    const active = new AbortController();
    fetch(`/api/items/game?ids=${encodeURIComponent(draft.itemId)}`, { signal: active.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("unavailable"))))
      .then((b: { items: Record<string, { weight: number | null }> }) => {
        const weight = b.items[draft.itemId]?.weight ?? null;
        setGameWeight({ id: draft.itemId, weight });
        // Only replace a weight we filled ourselves (or the empty default), never one you typed.
        const previous = autoWeight.current;
        if (weight !== null)
          setDraft((d) =>
            d.itemId === draft.itemId && (d.weight === 0 || d.weight === previous)
              ? { ...d, weight }
              : d,
          );
        autoWeight.current = weight;
      })
      .catch(() => {
        if (!active.signal.aborted) setGameWeight({ id: draft.itemId, weight: null });
      });
    return () => active.abort();
  }, [draft.itemId]);
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
    validationError = "Check the cargo quantity, a capacity above zero, prices and costs.";
  }
  const update = <K extends keyof TransportInput>(k: K, value: TransportInput[K]) =>
    setDraft((d) => ({ ...d, [k]: value }));
  const number = (n: number | null | undefined, suffix = "") =>
    n === null || n === undefined ? (
      <Unavailable />
    ) : (
      <AnimatedNumber value={n} digits={2} minimumDigits={0} suffix={suffix} />
    );
  async function load() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const requested = config;
    setPendingKey(requestKey);
    setPriceMessage(null);
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
      setPriceMessage(null);
    } catch {
      if (!active.signal.aborted) setPriceMessage({ text: PRICE_ERROR, error: true });
    } finally {
      if (controller.current === active) setPendingKey(null);
    }
  }
  // Observations for the cargo, route and quality load on their own until you type a price;
  // manual prices are never replaced without the button.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const manualPrices =
    (draft.buy.manual && draft.buy.value !== null) ||
    (draft.sell.manual && draft.sell.value !== null);
  useEffect(() => {
    if (manualPrices || !/^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/.test(draft.itemId)) return;
    const timer = window.setTimeout(() => void loadRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [requestKey, manualPrices, draft.itemId]);
  const name = equipmentName(draft.itemId);
  const missing = [
    ...(!transportPriceMatches(config, "buy") || draft.buy.value === null
      ? [`Purchase price in ${draft.fromCity}`]
      : []),
    ...(!transportPriceMatches(config, "sell") || draft.sell.value === null
      ? [`Sale price in ${draft.toCity}`]
      : []),
  ];
  const items =
    draft.quantity > 0
      ? `${draft.quantity.toLocaleString()} ${draft.quantity === 1 ? "item" : "items"}`
      : "No quantity";
  const sellLabel = draft.saleMode === "instant" ? "buy order" : "sell listing";
  const numberInput = (
    key: "quantity" | "weight" | "capacity" | "costPerTrip" | "risk" | "tax" | "fee",
    label: string,
    min = 0,
  ) => (
    <label key={key}>
      {label}
      <NumberField
        min={min}
        decimals={key === "quantity" ? 0 : 2}
        silver={key === "costPerTrip"}
        disabled={key === "fee" && draft.saleMode === "instant"}
        value={Number.isNaN(draft[key]) ? "" : draft[key]}
        onValueChange={(v) => update(key, v ?? NaN)}
      />
    </label>
  );
  const assumptions = `${Number.isFinite(draft.costPerTrip) ? draft.costPerTrip.toLocaleString() : "Check"} silver/trip · ${
    Number.isFinite(draft.tax) ? draft.tax : "Check"
  }% tax${draft.saleMode === "listing" ? ` · ${Number.isFinite(draft.fee) ? draft.fee : "Check"}% fee` : ""}`;

  const route = (
    <>
      <div className={s.identity}>
        <ItemIcon id={draft.itemId} quality={draft.quality} size={64} />
        <div>
          <h3>{name}</h3>
          <p>
            {qualities[draft.quality - 1]} · {draft.fromCity} → {draft.toCity}
          </p>
          <small>
            {gameWeight?.id === draft.itemId
              ? gameWeight.weight === null
                ? "No weight in game data; enter it below"
                : `${gameWeight.weight} kg each, from game data`
              : "Looking up the weight…"}
          </small>
        </div>
      </div>
      <CatalogItemPicker
        label="Find transport cargo"
        onSelect={(item) => update("itemId", item.id)}
      />
      <div className={s.fields}>
        {(
          [
            ["fromCity", "Buy in"],
            ["toCity", "Sell in"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <WellSelect
              value={draft[key]}
              onChange={(e) => update(key, e.target.value as TransportInput[typeof key])}
            >
              {cities
                .filter((c) => key !== "fromCity" || c !== "Black Market")
                .map((c) => (
                  <option key={c}>{c}</option>
                ))}
            </WellSelect>
          </label>
        ))}
        <label>
          Sale execution
          <WellSelect
            aria-label="Sale execution"
            value={draft.saleMode}
            onChange={(e) => update("saleMode", e.target.value as TransportInput["saleMode"])}
          >
            <option value="instant">Buy order</option>
            <option value="listing">My sell order</option>
          </WellSelect>
        </label>
        <label>
          Quality
          <WellSelect
            value={draft.quality}
            onChange={(e) => setDraft((d) => ({ ...d, quality: Number(e.target.value) }))}
          >
            {qualities.map((q, i) => (
              <option key={q} value={i + 1}>
                {q}
              </option>
            ))}
          </WellSelect>
        </label>
        {numberInput("quantity", "Cargo quantity", 1)}
        {numberInput("weight", "Weight per item (kg)")}
        <label>
          Mount
          <WellSelect
            aria-label="Mount"
            value={mount.id}
            onChange={(e) => {
              const next = { ...mount, id: e.target.value };
              setMount(next);
              const kg = mountCapacity(next.id, next.quality);
              if (kg) update("capacity", kg);
            }}
          >
            <option value="">No mount</option>
            {mounts.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {Math.round(m.capacity["1"] ?? 0).toLocaleString()} kg
              </option>
            ))}
          </WellSelect>
        </label>
        {mount.id ? (
          <label>
            Mount quality
            <WellSelect
              aria-label="Mount quality"
              value={mount.quality}
              onChange={(e) => {
                const next = { ...mount, quality: Number(e.target.value) };
                setMount(next);
                const kg = mountCapacity(next.id, next.quality);
                if (kg) update("capacity", kg);
              }}
            >
              {qualities.map((q, i) => (
                <option key={q} value={i + 1}>
                  {q}
                </option>
              ))}
            </WellSelect>
          </label>
        ) : null}
        {numberInput("capacity", "Available cargo capacity (kg)", 1)}
      </div>
      <div className={s.stack}>
        <Disclosure
          summary="Trip costs, risk & fees"
          meta={<span data-assumptions="">{assumptions}</span>}
        >
          <div className={s.fields}>
            {numberInput("costPerTrip", "Cost per trip")}
            {numberInput("risk", "Total manual risk allowance")}
            {numberInput("tax", "Transport sales tax (%)")}
            {numberInput("fee", "Transport listing fee (%)")}
            <p className={s.help}>
              The listing fee applies to sell orders only. The risk allowance is silver you set
              aside for the whole haul, for example what a gank would cost you.
            </p>
          </div>
        </Disclosure>
        <Disclosure summary="Item ID">
          <div className={s.fields}>
            <label className={s.wide}>
              Transport item identifier
              <input
                value={draft.itemId}
                maxLength={100}
                onChange={(e) => update("itemId", e.target.value.toUpperCase())}
              />
            </label>
            <p className={s.help}>
              Paste a game ID such as <strong>T4_BAG</strong> or <strong>T6_2H_BOW@1</strong> to
              carry an item the search doesn’t list.
            </p>
          </div>
        </Disclosure>
      </div>
    </>
  );

  const priceRow = (key: "buy" | "sell") => {
    const p = draft[key];
    const matches = transportPriceMatches(config, key);
    const value = matches ? p.value : null;
    const total =
      value === null || !Number.isFinite(draft.quantity) ? null : value * draft.quantity;
    const label = key === "buy" ? "Transport purchase unit price" : "Transport sale unit price";
    return (
      <li key={key} className={`${s.mat} ${key === "sell" ? s.matOutput : ""}`}>
        <ItemIcon id={draft.itemId} quality={draft.quality} size={40} />
        <span className={s.matName}>
          <strong>{key === "buy" ? `Buy in ${draft.fromCity}` : `Sell in ${draft.toCity}`}</strong>
          <small>
            {key === "buy" ? "Lowest sell order" : `Best ${sellLabel}`} · {items}
          </small>
          <small>
            <PriceSource
              manual={p.manual && p.value !== null}
              observedAt={matches ? p.observedAt : null}
              pending={busy}
            />
          </small>
        </span>
        <NumberField
          silver
          className={s.matInput}
          min={0}
          decimals={2}
          aria-label={label}
          placeholder="Price"
          value={value ?? ""}
          onValueChange={(v) =>
            update(key, {
              ...draft[key],
              value: v,
              manual: true,
              quality: draft.quality,
            })
          }
        />
        <span className={s.matTotal}>
          <span className="sr-only">Total </span>
          {total === null ? <Missing /> : coin(total)}
        </span>
      </li>
    );
  };
  const prices = (
    <>
      {busy ? (
        <StatusLine>
          Loading prices for {draft.fromCity} and {draft.toCity}…
        </StatusLine>
      ) : priceMessage?.error ? (
        <RetryLine onRetry={load}>{priceMessage.text}</RetryLine>
      ) : missing.length && !manualPrices ? (
        <StatusLine tone="stale">
          No order was seen for {missing.length === 2 ? "either price" : "one price"} at this
          quality. Type what you expect to pay or get.
        </StatusLine>
      ) : null}
      <div className={s.materials} role="region" aria-label="Purchase and sale prices">
        <div className={s.matHead} aria-hidden="true">
          <span>Market</span>
          <span>Unit price</span>
          <span>Total</span>
        </div>
        <ul>
          {priceRow("buy")}
          {priceRow("sell")}
        </ul>
      </div>
      <p className={s.help}>
        Prices load for each cargo, route and quality until you type one. Refresh replaces both with
        the latest orders.
      </p>
    </>
  );

  const complete = !!result?.complete;
  const na = (
    <span className={s.na}>
      <Unavailable />
    </span>
  );
  const results = (
    <>
      <div className={s.resultItem}>
        <ItemIcon id={draft.itemId} quality={draft.quality} size={52} />
        <span>
          <strong>{name}</strong>
          <small>
            {items} · {draft.fromCity} → {draft.toCity}
          </small>
        </span>
      </div>
      {validationError && (
        <p role="alert" className={s.alert}>
          {validationError}
        </p>
      )}
      <ResultFigure
        label="Net profit"
        tone={complete ? profitTone(result!.profit) : "even"}
        value={
          complete ? (
            <output aria-label="Estimated net profit" data-result="transport-profit">
              {coin(result!.profit)}
            </output>
          ) : (
            <Missing />
          )
        }
        note={
          complete
            ? `${profitWord(result!.profit)} after trip costs, risk and fees`
            : busy
              ? "Loading prices…"
              : "Price the cargo to see your profit"
        }
        aside={{
          label: "Margin",
          value: complete ? number(result!.margin, "%") : <Missing />,
        }}
      />
      <ResultPair
        result="transport-cash"
        items={[
          { label: "Total cost", value: complete ? coin(result!.cost) : na },
          { label: "Revenue", value: complete ? coin(result!.revenue) : na },
        ]}
      />
      {result && !complete && (
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
      {result?.stale && (
        <StatusLine tone="stale">
          Includes prices over an hour old. Refresh before you buy.
        </StatusLine>
      )}
      {result && (
        <ResultRows
          result="transport-cargo"
          items={[
            { label: "Cargo weight", value: number(result.totalWeight, " kg") },
            { label: "Capacity per trip", value: number(draft.capacity, " kg") },
            { label: "Trips", value: result.trips.toLocaleString() },
            ...(complete
              ? [
                  { label: "Trip costs and risk", value: coin(result.transportCost) },
                  { label: "Tax and fees", value: coin(result.fees) },
                  {
                    label: "Return on cost",
                    value: number(result.roi, "%"),
                    tone: profitTone(result.roi),
                  },
                ]
              : []),
          ]}
        />
      )}
      {complete && (
        <p className={s.resultNote}>
          {manualPrices ? "Includes prices you typed. " : "From observed orders with their times. "}
          Your load, bags, food and the danger of the route aren’t counted.
        </p>
      )}
    </>
  );

  const details = (
    <div className={c.saved}>
      <Disclosure summary="Saved transport plans">
        <div className={c.savedBody}>
          <label className={c.savedTitle}>
            Transport plan title
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
          </label>
          <div className={c.savedActions}>
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
                  setNextCursor(null);
                  const r = await fetch("/api/scenarios?kind=transporting"),
                    b = await r.json();
                  if (!r.ok) throw new Error(b.error);
                  setSaved(b.filter((s: { kind: string }) => s.kind === "transporting"));
                  setNextCursor(r.headers.get("X-Next-Cursor"));
                } catch (e) {
                  setMessage(e instanceof Error ? e.message : "Load failed");
                }
              }}
            >
              Load transport plans
            </button>
          </div>
          {saved.length > 0 && (
            <ul className={c.savedList}>
              {saved.map((s) => (
                <li key={s.id}>
                  <span>{s.title}</span>
                  <button
                    className="button secondary"
                    aria-label={`Restore ${s.title}`}
                    onClick={() => {
                      const p = transportSchema.safeParse(s.configuration);
                      if (p.success) {
                        setDraft({ ...p.data, region });
                        setMessage(
                          `Restored ${s.title} on your current server. Refresh prices that don’t match.`,
                        );
                      } else setMessage("This saved plan is invalid.");
                    }}
                  >
                    Restore
                  </button>
                  <button
                    className="button secondary"
                    aria-label={`Delete ${s.title}`}
                    onClick={async () => {
                      const r = await fetch(`/api/scenarios/${s.id}`, { method: "DELETE" });
                      if (r.ok) {
                        setSaved(saved.filter((v) => v.id !== s.id));
                        setMessage("Transport plan deleted.");
                      } else setMessage("Delete failed.");
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
          <AccountPageMore<(typeof saved)[number]>
            url="/api/scenarios?kind=transporting"
            cursor={nextCursor}
            disabled={busy}
            label="Load older transport plans"
            onPage={(older, cursor) => {
              setSaved((current) => appendAccountRows(current, older));
              setNextCursor(cursor);
            }}
          />
          {message && <StatusLine>{message}</StatusLine>}
        </div>
      </Disclosure>
    </div>
  );

  return (
    <div className={s.journey}>
      <CalculatorShell
        label="Transport workflow"
        step={step}
        onStep={goToStep}
        details={details}
        summary={{
          label: "Net profit",
          tone: complete ? profitTone(result!.profit) : "even",
          value: complete ? (
            coin(result!.profit)
          ) : (
            <span className={s.summaryPending}>
              {missing.length
                ? `${missing.length} ${missing.length === 1 ? "price" : "prices"} to go`
                : "Unavailable"}
            </span>
          ),
        }}
        steps={[
          {
            id: steps[0],
            label: "Route & cargo",
            title: "Route and cargo",
            line: "What you carry, where, and how much fits per trip.",
            children: route,
          },
          {
            id: steps[1],
            label: "Price cargo",
            title: "Prices",
            line: `Buy in ${draft.fromCity} · sell to a ${sellLabel} in ${draft.toCity}. Type any price to override it.`,
            actions: (
              <button
                type="button"
                className={`button secondary ${s.refresh}`}
                aria-label="Refresh transport market prices"
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
