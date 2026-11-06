"use client";
import { AnimatedNumber } from "./animated-number";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, CircleCheck, RefreshCw } from "lucide-react";
import { fishConversion, fishFame, type FishReference } from "@/lib/albion/fishing";
import { cities } from "@/lib/albion/region-config";
import { isStale, sourceTimestamp } from "@/lib/albion/freshness";
import { useBatchQuotes, quoteKey } from "./market-batch-quotes";
import { useOutpostRegion } from "./region-context";
import { ItemIcon } from "./item-icon";
import { EditorDialog } from "./editor-dialog";
import {
  CalculatorShell,
  ResultFigure,
  ResultPair,
  ResultRows,
  useCalculatorStep,
  RetryLine,
} from "./calculator-shell";
import { coin, PriceSource, profitTone, Missing, PRICE_ERROR } from "./calculator-figures";
import { Disclosure } from "./disclosure";
import { PanelHead } from "./panel-head";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
import s from "./calculator-shell.module.css";
import c from "@/app/calculators.module.css";
const amount = (value: number | null | undefined) =>
  value === null || value === undefined ? (
    <Unavailable />
  ) : (
    <AnimatedNumber value={value} digits={2} minimumDigits={0} />
  );
const steps = ["fishing-catch", "fishing-prices", "fishing-result"];
const modes = [
  ["chopping", "Chop or sell"],
  ["leveling", "Fishing fame"],
] as const;
export function FishingCalculator({
  fish,
  initialMode = "chopping",
  compact = false,
}: {
  fish: FishReference[];
  initialMode?: "chopping" | "leveling";
  /** Inside a guide's reading column: one mode, the three panels stacked. */
  compact?: boolean;
}) {
  const region = useOutpostRegion();
  const instance = useId();
  const [selectedId, setSelectedId] = useState(
    fish.find((f) => f.id === "T3_FISH_FRESHWATER_ALL_COMMON")?.id || fish[0].id,
  );
  const [mode, setMode] = useState(initialMode);
  const [city, setCity] = useState("Fort Sterling");
  const [query, setQuery] = useState("");
  const [picker, setPicker] = useState(false);
  const [quantity, setQuantity] = useState(100);
  const [target, setTarget] = useState(100000);
  const [purchaseFee, setPurchaseFee] = useState("0");
  const [saleFee, setSaleFee] = useState("");
  const [processingCost, setProcessingCost] = useState("0");
  const [saleBasis, setSaleBasis] = useState<"bid" | "ask">("bid");
  const [manual, setManual] = useState<Record<string, string>>({});
  const [step, goToStep] = useCalculatorStep(steps);
  const { quotes, busy, refresh } = useBatchQuotes(region);
  // One batch covers every fish and chops across cities, so it loads once per server.
  const refreshAll = () =>
    refresh([
      ...fish.map((f) => ({ itemId: f.id, quality: 1 })),
      { itemId: "T1_FISHCHOPS", quality: 1 },
    ]);
  const refreshRef = useRef(refreshAll);
  useEffect(() => {
    refreshRef.current = refreshAll;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => void refreshRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [region]);
  const selected = fish.find((f) => f.id === selectedId) || fish[0];
  const prefix = `${region}:${city}:${selected.id}:`;
  const fieldKey = (key: string) => prefix + key;
  const edit = (key: string, value: string) =>
    setManual((previous) => ({ ...previous, [fieldKey(key)]: value }));
  const selectedQuote = quotes[quoteKey({ itemId: selected.id, quality: 1 })];
  function sourcePrice(id: string, side: "bid" | "ask") {
    const quote = quotes[quoteKey({ itemId: id, quality: 1 })];
    const row = quote?.prices.find((p) => p.city === city);
    const value = side === "ask" ? row?.sell_price_min : row?.buy_price_max;
    const observedAt = side === "ask" ? row?.sell_price_min_date : row?.buy_price_max_date;
    const date =
      value && value > 0 && observedAt && Number.isFinite(sourceTimestamp(observedAt))
        ? observedAt
        : undefined;
    const stale = !!date && isStale(date);
    return {
      value: value && value > 0 && date && !stale ? value : null,
      date,
      stale,
      error: quote?.error,
    };
  }
  function priceValue(key: string, id: string, side: "bid" | "ask") {
    return Object.hasOwn(manual, fieldKey(key))
      ? manual[fieldKey(key)]
      : String(sourcePrice(id, side).value ?? "");
  }
  const number = (value: string) => (value === "" ? null : Number(value));
  const purchase = number(priceValue("purchase", selected.id, "ask"));
  const rawSale = number(priceValue("raw-sale", selected.id, saleBasis));
  const choppedSale = number(priceValue("chop-sale", "T1_FISHCHOPS", saleBasis));
  const yieldValue = Object.hasOwn(manual, fieldKey("yield"))
    ? manual[fieldKey("yield")]
    : String(selected.choppedPerFish);
  const fameValue = Object.hasOwn(manual, fieldKey("fame"))
    ? manual[fieldKey("fame")]
    : String(selected.historicalFame ?? "");
  let conversion: ReturnType<typeof fishConversion> | null = null,
    leveling: ReturnType<typeof fishFame> | null = null,
    error = "";
  try {
    if (mode === "chopping" && saleFee !== "")
      conversion = fishConversion({
        quantity,
        choppedPerFish: Number(yieldValue),
        purchasePrice: purchase,
        rawSalePrice: rawSale,
        choppedSalePrice: choppedSale,
        purchaseFee: Number(purchaseFee),
        saleFee: Number(saleFee),
        choppingCost: Number(processingCost),
      });
    if (mode === "leveling")
      leveling = fishFame({
        target,
        famePerFish: number(fameValue),
        purchasePrice: purchase,
        purchaseFee: Number(purchaseFee),
      });
  } catch {
    error = "Check quantities, prices, fees, your yield and fame. Keep totals under a trillion.";
  }
  const sideLabel = saleBasis === "bid" ? "Best buy order" : "Lowest sell order";
  function priceRow(
    key: string,
    label: string,
    id: string,
    side: "bid" | "ask",
    name: string,
    note: string,
    count: number | null,
    output = false,
  ) {
    const manualValue = Object.hasOwn(manual, fieldKey(key)),
      source = sourcePrice(id, side),
      raw = priceValue(key, id, side),
      value = number(raw),
      total = value === null || count === null ? null : value * count;
    return (
      <li key={key} className={`${s.mat} ${output ? s.matOutput : ""}`}>
        <ItemIcon id={id} size={40} />
        <span className={s.matName}>
          <strong>{name}</strong>
          <small>{note}</small>
          <small id={`${instance}-${key}-source`}>
            <PriceSource
              manual={manualValue}
              observedAt={source.date}
              pending={busy && !source.date}
            />
          </small>
        </span>
        <input
          className={s.matInput}
          type="number"
          aria-label={label}
          aria-describedby={`${instance}-${key}-source`}
          min={0}
          max={1e12}
          step="any"
          value={raw}
          placeholder="Price"
          onChange={(event) => edit(key, event.target.value)}
        />
        <span className={s.matTotal}>
          <span className="sr-only">Total </span>
          {total === null ? <Missing /> : coin(total)}
        </span>
      </li>
    );
  }
  const matches = fish.filter((f) =>
    `${f.name} ${f.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const chops = Number(yieldValue) > 0 ? Number(yieldValue) * quantity : null;
  const browser = (
    <div className={s.browser} aria-label="Fish browser" role="group">
      <div className={s.browserHead}>
        <label className={s.browserSearch}>
          <span>Find a fish</span>
          <input
            type="search"
            value={query}
            maxLength={100}
            placeholder="Perch, eel, sturgeon…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className={s.browserCount}>{fish.length} fish</span>
      </div>
      <div className={s.browserList}>
        {matches.map((f) => (
          <button
            type="button"
            key={f.id}
            aria-pressed={selected.id === f.id}
            onClick={() => {
              setSelectedId(f.id);
              setPicker(false);
            }}
          >
            <ItemIcon id={f.id} size={40} />
            <span>
              <strong>{f.name}</strong>
              <small>
                T{f.tier} · {f.choppedPerFish} chopped fish each
              </small>
            </span>
            {selected.id === f.id && <CircleCheck size={16} aria-hidden="true" />}
          </button>
        ))}
        {!matches.length && <StatusLine>No fish matches. Try another name.</StatusLine>}
      </div>
    </div>
  );
  const catchPanel = (
    <>
      <div className={s.identity}>
        <ItemIcon id={selected.id} size={64} />
        <div>
          <h3>{selected.name}</h3>
          <p>T{selected.tier} · Normal quality</p>
          <small>{selected.choppedPerFish} chopped fish each. Confirm your yield in game.</small>
        </div>
        <button type="button" className="button secondary" onClick={() => setPicker(true)}>
          Change fish
        </button>
      </div>
      <div className={s.fields}>
        <label>
          Market
          <WellSelect
            aria-label="Fishing market city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            {cities
              .filter((c) => c !== "Black Market")
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </WellSelect>
        </label>
        {mode === "chopping" ? (
          <>
            <label>
              Fish quantity
              <input
                type="number"
                min={1}
                max={1000000}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
            <label>
              Chopped fish per raw fish
              <input
                type="number"
                aria-label="Chopped fish per raw fish"
                min={1}
                max={10000}
                value={yieldValue}
                onChange={(e) => edit("yield", e.target.value)}
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Target fishing fame
              <input
                type="number"
                min={1}
                max={1e12}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </label>
            <label>
              Fame per consumed fish
              <input
                type="number"
                min={0}
                max={1e9}
                step="any"
                aria-label="Fame per consumed fish"
                aria-describedby={`${instance}-fame-help`}
                value={fameValue}
                placeholder="Your fame"
                onChange={(e) => edit("fame", e.target.value)}
              />
            </label>
            <p id={`${instance}-fame-help`} className={s.help}>
              The starting fame is an older Premium value. Type what you get in game.
            </p>
          </>
        )}
      </div>
      <div className={s.stack}>
        <Disclosure summary="Price basis & extra costs">
          <div className={s.fields}>
            <label>
              Purchase order fee (%)
              <input
                type="number"
                min={0}
                max={100}
                step="any"
                value={purchaseFee}
                onChange={(e) => setPurchaseFee(e.target.value)}
              />
            </label>
            {mode === "chopping" && (
              <>
                <label>
                  Total chopping cost · silver
                  <input
                    type="number"
                    min={0}
                    max={1e12}
                    step="any"
                    value={processingCost}
                    onChange={(e) => setProcessingCost(e.target.value)}
                  />
                </label>
                <label className={s.wide}>
                  Sell at
                  <WellSelect
                    value={saleBasis}
                    onChange={(e) => setSaleBasis(e.target.value as "bid" | "ask")}
                  >
                    <option value="bid">The best buy order (sell now)</option>
                    <option value="ask">The lowest sell order (list and wait)</option>
                  </WellSelect>
                </label>
              </>
            )}
            <button
              type="button"
              className={`button secondary ${s.wide} ${c.start}`}
              onClick={() =>
                setManual((previous) =>
                  Object.fromEntries(
                    Object.entries(previous).filter(([key]) => !key.startsWith(prefix)),
                  ),
                )
              }
            >
              Clear prices I typed for this fish
            </button>
          </div>
        </Disclosure>
      </div>
    </>
  );
  const pricesPanel = (
    <>
      {busy ? (
        <StatusLine>Loading prices in {city}…</StatusLine>
      ) : selectedQuote?.error ? (
        <RetryLine onRetry={() => void refreshAll()}>{PRICE_ERROR}</RetryLine>
      ) : null}
      <div className={s.materials} role="region" aria-label="Fish prices">
        <div className={s.matHead} aria-hidden="true">
          <span>Item</span>
          <span>Unit price</span>
          <span>Total</span>
        </div>
        <ul>
          {priceRow(
            "purchase",
            "Raw fish purchase price",
            selected.id,
            "ask",
            `Buy ${selected.name}`,
            `Lowest sell order · ${mode === "chopping" ? quantity.toLocaleString() : (leveling?.needed?.toLocaleString() ?? "how many")} fish`,
            mode === "chopping" ? quantity : (leveling?.needed ?? null),
          )}
          {mode === "chopping" &&
            priceRow(
              "raw-sale",
              "Raw fish sale price",
              selected.id,
              saleBasis,
              "Sell whole",
              `${sideLabel} · ${quantity.toLocaleString()} fish`,
              quantity,
              true,
            )}
          {mode === "chopping" &&
            priceRow(
              "chop-sale",
              "Chopped fish sale price",
              "T1_FISHCHOPS",
              saleBasis,
              "Sell chopped",
              `${sideLabel} · ${chops === null ? "" : `${chops.toLocaleString()} `}chopped fish`,
              chops,
              true,
            )}
        </ul>
      </div>
      {mode === "chopping" && (
        <div className={s.fields}>
          <label>
            Total sale fees (%)
            <input
              type="number"
              min={0}
              max={100}
              step="any"
              value={saleFee}
              placeholder="Tax + listing"
              onChange={(e) => setSaleFee(e.target.value)}
            />
          </label>
          <p className={`${s.help} ${c.alignEnd}`}>
            Your sales tax plus any listing fee. Premium players pay less tax.
          </p>
        </div>
      )}
    </>
  );
  const missing = [
    ...(purchase === null ? ["Fish purchase price"] : []),
    ...(mode === "chopping" && rawSale === null ? ["Whole fish sale price"] : []),
    ...(mode === "chopping" && choppedSale === null ? ["Chopped fish sale price"] : []),
    ...(mode === "chopping" && saleFee === "" ? ["Sale fees (%)"] : []),
    ...(mode === "leveling" && fameValue === "" ? ["Fame per consumed fish"] : []),
  ];
  const na = (
    <span className={s.na}>
      <Unavailable />
    </span>
  );
  const advantage = conversion?.advantage ?? null;
  const results = (
    <>
      <div className={s.resultItem}>
        <ItemIcon id={selected.id} size={52} />
        <span>
          <strong>{selected.name}</strong>
          <small>
            {mode === "chopping"
              ? `${quantity.toLocaleString()} fish · ${city}`
              : `${target.toLocaleString()} fame · ${city}`}
          </small>
        </span>
      </div>
      {error && (
        <p role="alert" className={s.alert}>
          {error}
        </p>
      )}
      {mode === "chopping" ? (
        <>
          <ResultFigure
            label="Chopping instead of selling whole"
            tone={advantage === null ? "even" : profitTone(advantage)}
            value={
              <span data-result="fish-chop-advantage">
                {advantage === null ? <Missing /> : coin(advantage)}
              </span>
            }
            note={
              advantage === null
                ? "Price the catch to compare"
                : advantage > 0
                  ? "Chop them: more silver than selling whole"
                  : advantage < 0
                    ? "Sell them whole: chopping loses silver"
                    : "No difference either way"
            }
          />
          <ResultPair
            result="fish-profits"
            items={[
              {
                label: "Buy, chop and sell",
                value: (
                  <span data-result="fish-chop-profit">
                    {conversion?.choppedProfit == null ? na : coin(conversion.choppedProfit)}
                  </span>
                ),
              },
              {
                label: "Buy and sell whole",
                value: conversion?.rawProfit == null ? na : coin(conversion.rawProfit),
              },
            ]}
          />
        </>
      ) : (
        <>
          <ResultFigure
            label="Cost of your fame target"
            value={
              <span data-result="fishing-target-cost">
                {leveling?.cost == null ? <Missing /> : coin(leveling.cost)}
              </span>
            }
            note={
              leveling?.needed == null
                ? "Set the fame per fish and the price"
                : `${leveling.needed.toLocaleString()} whole fish, rounded up`
            }
          />
          <ResultPair
            result="fish-fame"
            items={[
              {
                label: "Fish needed",
                value: (
                  <span data-result="fishing-fish-needed">
                    {leveling?.needed == null ? na : amount(leveling.needed)}
                  </span>
                ),
              },
              {
                label: "Silver per 1,000 fame",
                value: leveling?.silverPerThousand == null ? na : coin(leveling.silverPerThousand),
              },
            ]}
          />
        </>
      )}
      {missing.length > 0 && (
        <div className={s.readiness} data-result="readiness" role="status">
          <strong>
            {missing.length} {missing.length === 1 ? "input" : "inputs"} to go
          </strong>
          <ul>
            {missing.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <button
            type="button"
            className="button secondary"
            onClick={() => goToStep(mode === "leveling" && fameValue === "" ? 1 : 2)}
          >
            {mode === "leveling" && fameValue === "" ? "Set your fame" : "Add prices"}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {mode === "chopping" && conversion && (
        <ResultRows
          result="fish-rows"
          items={[
            { label: "Chopped fish made", value: amount(conversion.quantity) },
            { label: "Upfront silver, with chopping", value: coin(conversion.upfront) },
            {
              label: "Break-even chopped price",
              value: conversion.breakEven == null ? <Unavailable /> : coin(conversion.breakEven),
            },
          ]}
        />
      )}
      {mode === "leveling" && leveling?.actualFame != null && (
        <ResultRows
          result="fish-fame-rows"
          items={[{ label: "Fame from those fish", value: amount(leveling.actualFame) }]}
        />
      )}
      <p className={s.resultNote}>
        {mode === "chopping"
          ? "Both routes start from buying the catch. Fees and chopping cost are your assumptions; prices over an hour old aren’t used."
          : "Whole fish, rounded up to reach your target. Learning points and level thresholds aren’t counted."}
      </p>
    </>
  );
  const stepList = [
    {
      id: steps[0],
      label: "Choose catch",
      title: "Your catch",
      line:
        mode === "chopping"
          ? "Which fish, where you trade it and how many."
          : "Which fish you eat and how much fame you want.",
      children: catchPanel,
    },
    {
      id: steps[1],
      label: "Price it",
      title: "Prices",
      line: `${city} market. Type any price to override it.`,
      actions: (
        <button
          type="button"
          className={`button secondary ${s.refresh}`}
          aria-label="Refresh fish observations"
          aria-busy={busy}
          disabled={busy}
          onClick={() => void refreshAll()}
        >
          <RefreshCw size={15} aria-hidden="true" />
          {busy ? "Updating…" : "Refresh"}
        </button>
      ),
      children: pricesPanel,
    },
    {
      id: steps[2],
      label: mode === "chopping" ? "Chop or sell" : "Fame cost",
      title: mode === "chopping" ? "Chop or sell?" : "Fame cost",
      children: results,
    },
  ];
  const dialog = picker && (
    <EditorDialog open title="Choose a fish" drawer onClose={() => setPicker(false)}>
      {browser}
    </EditorDialog>
  );
  if (compact)
    return (
      <div className={`${s.journey} ${c.stacked}`}>
        {dialog}
        {stepList.map((item, i) => (
          <section key={item.id} className="panel" aria-labelledby={`${item.id}-title`}>
            <PanelHead
              id={`${item.id}-title`}
              as="h3"
              step={i + 1}
              title={item.title}
              line={item.line}
              actions={item.actions}
            />
            {item.children}
          </section>
        ))}
      </div>
    );
  return (
    <div className={s.journey}>
      {dialog}
      <div className={s.modeBar}>
        <nav className={s.modes} aria-label="Use your catch">
          {modes.map(([key, label]) => (
            <a
              key={key}
              href={key === "leveling" ? "?mode=leveling" : "?"}
              aria-current={mode === key ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                setMode(key);
                const url = new URL(window.location.href);
                if (key === "leveling") url.searchParams.set("mode", "leveling");
                else url.searchParams.delete("mode");
                history.replaceState(history.state, "", url);
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
      <CalculatorShell
        label="Fishing workflow"
        step={step}
        onStep={goToStep}
        summary={
          mode === "chopping"
            ? {
                label: "Chopping vs whole",
                tone: advantage === null ? "even" : profitTone(advantage),
                value:
                  advantage === null ? (
                    <span className={s.summaryPending}>
                      {missing.length
                        ? `${missing.length} ${missing.length === 1 ? "input" : "inputs"} to go`
                        : "Unavailable"}
                    </span>
                  ) : (
                    coin(advantage)
                  ),
              }
            : {
                label: "Fame target cost",
                value:
                  leveling?.cost == null ? (
                    <span className={s.summaryPending}>
                      {missing.length
                        ? `${missing.length} ${missing.length === 1 ? "input" : "inputs"} to go`
                        : "Unavailable"}
                    </span>
                  ) : (
                    coin(leveling.cost)
                  ),
              }
        }
        steps={stepList}
      />
    </div>
  );
}
