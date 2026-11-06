"use client";
import { AnimatedNumber } from "./animated-number";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CircleCheck, RefreshCw } from "lucide-react";
import { EditorDialog } from "./editor-dialog";
import { useRouter } from "next/navigation";
import {
  crops,
  farming,
  farmingSchema,
  initialFarming,
  type FarmingInput,
} from "@/lib/albion/farming";
import { quoteResponse } from "@/lib/albion/market-quotes";
import { cities } from "@/lib/albion/region-config";
import { useOutpostRegion } from "./region-context";
import { ItemIcon } from "./item-icon";
import { ScenarioControls } from "./scenario-controls";
import {
  CalculatorShell,
  ResultFigure,
  ResultPair,
  ResultRows,
  useCalculatorStep,
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
const steps = ["farming-plan", "farming-prices", "farming-result"];
const cropLabel = (crop: (typeof crops)[number]) => `T${crop.tier} · ${crop.type}`;
export function FarmingCalculator() {
  const router = useRouter();
  const region = useOutpostRegion(),
    [draft, setDraft] = useState(() => initialFarming(region));
  const [query, setQuery] = useState(""),
    [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null),
    [busy, setBusy] = useState(false);
  const [step, goToStep] = useCalculatorStep(steps);
  const [picker, setPicker] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const crop = crops.find((c) => c.productId === draft.cropId)!;
  const config = { ...draft, region };
  useEffect(
    () => () => controller.current?.abort(),
    [region, draft.cropId, draft.materialCity, draft.outputCity],
  );
  let result: ReturnType<typeof farming> | null = null;
  let error = "";
  try {
    result = farming(config);
  } catch (e) {
    error =
      e instanceof Error && e.message.startsWith("Farming totals")
        ? e.message
        : "Check planted and watered quantities, yield, fees and focus inputs.";
  }
  function update<K extends keyof FarmingInput>(key: K, value: FarmingInput[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  async function refresh() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const requested = config;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/market/batch?${new URLSearchParams({ region, items: [crop.seedId, crop.productId].join(","), quality: "1" })}`,
        { signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) },
      );
      if (!response.ok) throw new Error("Prices couldn’t be loaded. Your inputs were kept.");
      const body = quoteResponse.parse(await response.json());
      if (request.signal.aborted) return;
      if (body.region !== requested.region)
        throw new Error("Prices came back for another server. Your inputs were kept.");
      setDraft((d) => {
        if (
          d.cropId !== requested.cropId ||
          d.materialCity !== requested.materialCity ||
          d.outputCity !== requested.outputCity
        )
          return d;
        const next = { ...d };
        for (const [key, id, city] of [
          ["seedPrice", crop.seedId, requested.materialCity],
          ["productPrice", crop.productId, requested.outputCity],
        ] as const) {
          if (d[key] !== requested[key] || (d[key].manual && d[key].value !== null)) continue;
          const row = body.prices.find(
            (p) => p.item_id === id && p.city === city && p.quality === 1,
          );
          next[key] = {
            itemId: id,
            value: row?.sell_price_min || null,
            manual: false,
            quality: 1,
            region: requested.region,
            city,
            observedAt: row?.sell_price_min ? row.sell_price_min_date : null,
          };
        }
        return next;
      });
      setMessage({
        text: [draft.seedPrice, draft.productPrice].some((p) => p.manual && p.value !== null)
          ? "Prices loaded. Manual prices kept."
          : "Prices loaded.",
      });
    } catch {
      if (!request.signal.aborted)
        setMessage({
          text: PRICE_ERROR,
          error: true,
        });
    } finally {
      if (controller.current === request) setBusy(false);
    }
  }
  // Observations for the crop and markets load on their own; manual prices are always kept.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => void refreshRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [region, draft.cropId, draft.materialCity, draft.outputCity]);
  function choose(productId: string) {
    const next = crops.find((c) => c.productId === productId);
    if (!next) return;
    controller.current?.abort();
    setBusy(false);
    setDraft((d) => ({
      ...d,
      cropId: next.productId,
      seedYieldBase: next.seedYieldBase,
      seedYieldWatered: next.seedYieldWatered,
      seedPrice: initialFarming(region).seedPrice,
      productPrice: initialFarming(region).productPrice,
    }));
    setMessage({ text: `Seed returns set for ${next.productName}. Confirm them in game.` });
  }
  const matchesPrice = (key: "seedPrice" | "productPrice") => {
    const p = config[key];
    const city = key === "seedPrice" ? draft.materialCity : draft.outputCity;
    return (
      p.quality === 1 &&
      (p.manual ||
        (p.region === region &&
          p.city === city &&
          p.itemId === (key === "seedPrice" ? crop.seedId : crop.productId)))
    );
  };
  function priceRow(key: "seedPrice" | "productPrice", label: string) {
    const p = config[key];
    const matches = matchesPrice(key);
    const value = matches ? p.value : null;
    const seed = key === "seedPrice";
    const count = seed ? draft.plants : (result?.harvest ?? null);
    const total =
      value === null || count === null || !Number.isFinite(count) ? null : value * count;
    return (
      <li key={key} className={`${s.mat} ${seed ? "" : s.matOutput}`}>
        <ItemIcon id={seed ? crop.seedId : crop.productId} size={40} />
        <span className={s.matName}>
          <strong>{seed ? `${crop.productName} seeds` : crop.productName}</strong>
          <small>
            {seed
              ? `${draft.plants.toLocaleString()} to plant · ${draft.materialCity}`
              : `${result?.harvest == null ? "Harvest not set" : `${result.harvest.toLocaleString()} to sell`} · ${draft.outputCity}`}
          </small>
          <small id={`farming-${key}-source`}>
            <PriceSource
              manual={p.manual && value !== null}
              observedAt={matches && !p.manual ? p.observedAt : null}
              pending={busy}
            />
          </small>
        </span>
        <input
          className={s.matInput}
          aria-label={label}
          aria-describedby={`farming-${key}-source`}
          type="number"
          min={0}
          max={1e12}
          step="any"
          value={value ?? ""}
          placeholder="Price"
          onChange={(e) =>
            update(key, {
              value: e.target.value === "" ? null : Number(e.target.value),
              manual: true,
              quality: 1,
              region: null,
              city: null,
              observedAt: null,
            })
          }
        />
        <span className={s.matTotal}>
          <span className="sr-only">Total </span>
          {total === null ? <Missing /> : coin(total)}
        </span>
      </li>
    );
  }
  const visible = crops.filter((c) =>
    `${c.productName} ${c.type} T${c.tier}`.toLowerCase().includes(query.toLowerCase()),
  );
  const browser = (
    <div className={s.browser} aria-label="Crop browser" role="group">
      <div className={s.browserHead}>
        <label className={s.browserSearch}>
          <span>Find a crop</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Carrots, herbs, T5…"
          />
        </label>
        <span className={s.browserCount}>{crops.length} crops and herbs</span>
      </div>
      <div className={s.browserList}>
        {visible.map((c) => (
          <button
            type="button"
            key={c.productId}
            aria-pressed={c.productId === crop.productId}
            onClick={() => {
              choose(c.productId);
              setPicker(false);
            }}
          >
            <ItemIcon id={c.productId} size={40} />
            <span>
              <strong>{c.productName}</strong>
              <small> {cropLabel(c)}</small>
            </span>
            {c.productId === crop.productId && <CircleCheck size={16} aria-hidden="true" />}
          </button>
        ))}
        {!visible.length && <StatusLine>No crop matches. Try a name or tier.</StatusLine>}
      </div>
    </div>
  );
  const plan = (
    <>
      <div className={s.identity}>
        <ItemIcon id={crop.productId} size={64} />
        <div>
          <h3>{crop.productName}</h3>
          <p>One harvest · {cropLabel(crop)}</p>
          <small>
            Seeds back per plant: {draft.seedYieldBase}% unwatered, {draft.seedYieldWatered}%
            watered
          </small>
        </div>
        <button type="button" className="button secondary" onClick={() => setPicker(true)}>
          Change crop
        </button>
      </div>
      <div className={s.fields}>
        <label>
          Seeds to plant
          <input
            type="number"
            min={1}
            max={100000}
            value={draft.plants}
            onChange={(e) => update("plants", Number(e.target.value))}
          />
        </label>
        <label>
          Plants to water
          <input
            type="number"
            min={0}
            max={draft.plants}
            value={draft.wateredPlants}
            aria-invalid={draft.wateredPlants > draft.plants}
            onChange={(e) => update("wateredPlants", Number(e.target.value))}
          />
        </label>
        <label>
          Harvest per plant
          <input
            aria-label="Harvest per plant"
            aria-describedby="farming-harvest-help"
            type="number"
            min={0}
            max={1000}
            step="any"
            placeholder="Your yield"
            value={draft.harvestPerPlant ?? ""}
            onChange={(e) =>
              update("harvestPerPlant", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </label>
        <label>
          Actual total watering focus
          <input
            type="number"
            min={0}
            max={1e9}
            value={draft.focus ?? ""}
            placeholder="Optional"
            onChange={(e) => update("focus", e.target.value === "" ? null : Number(e.target.value))}
          />
        </label>
        <p id="farming-harvest-help" className={s.help}>
          Harvest per plant is what you expect to pick, with your Premium and island bonuses. The
          game doesn’t guarantee it, so use your own numbers.
        </p>
      </div>
      {error && (
        <p role="alert" className={s.alert}>
          {error}
        </p>
      )}
      <div className={s.stack}>
        <Disclosure
          summary="Seed returns & fees"
          meta={
            <span data-assumptions="">
              {draft.seedYieldBase}% unwatered · {draft.seedYieldWatered}% watered
            </span>
          }
        >
          <div className={s.fields}>
            {(
              [
                ["seedYieldBase", "Unwatered seed yield (%)", 300],
                ["seedYieldWatered", "Watered seed yield (%)", 300],
                ["buyFee", "Seed purchase fee (%)", 100],
                ["sellFee", "Produce sales tax + setup (%)", 100],
                ["operatingCost", "Other costs per harvest · silver", 1e12],
              ] as const
            ).map(([key, label, max]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min={0}
                  max={max}
                  step="any"
                  value={draft[key]}
                  onChange={(e) => update(key, Number(e.target.value))}
                />
              </label>
            ))}
            <p className={s.help}>
              Seed returns are past values for this crop; check yours in game. 200% means two seeds
              back per plant.
            </p>
          </div>
        </Disclosure>
      </div>
    </>
  );
  const pricesPanel = (
    <>
      {busy ? (
        <StatusLine>Loading prices…</StatusLine>
      ) : message?.error ? (
        <div className={s.errorLine}>
          <StatusLine tone="error">{message.text}</StatusLine>
          <button type="button" onClick={refresh}>
            Retry
          </button>
        </div>
      ) : message ? (
        <StatusLine>{message.text}</StatusLine>
      ) : null}
      <div className={s.fields}>
        {(
          [
            ["materialCity", "Buy seeds in"],
            ["outputCity", "Sell produce in"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <WellSelect
              value={draft[key]}
              onChange={(e) => update(key, e.target.value as FarmingInput[typeof key])}
            >
              {cities
                .filter((c) => c !== "Black Market" || draft[key] === c)
                .map((c) => (
                  <option key={c} disabled={c === "Black Market"}>
                    {c}
                  </option>
                ))}
            </WellSelect>
          </label>
        ))}
      </div>
      <div className={s.materials} role="region" aria-label="Seed and produce prices">
        <div className={s.matHead} aria-hidden="true">
          <span>Item</span>
          <span>Unit price</span>
          <span>Total</span>
        </div>
        <ul>
          {priceRow("seedPrice", "Seed unit price · silver")}
          {priceRow("productPrice", "Produce unit price · silver")}
        </ul>
      </div>
      <p className={s.help}>
        Loaded prices are the lowest sell orders. Type a buy-order or agreed price to use it
        instead.
      </p>
    </>
  );
  const complete = !!result?.complete;
  const missing = [
    ...(draft.harvestPerPlant === null ? ["Harvest per plant"] : []),
    ...(!matchesPrice("seedPrice") || draft.seedPrice.value === null ? ["Seed price"] : []),
    ...(!matchesPrice("productPrice") || draft.productPrice.value === null
      ? ["Produce price"]
      : []),
  ];
  const na = (
    <span className={s.na}>
      <Unavailable />
    </span>
  );
  const number = (n: number | null | undefined) =>
    n == null ? <Unavailable /> : <AnimatedNumber value={n} digits={2} minimumDigits={0} />;
  const results = (
    <>
      <div className={s.resultItem}>
        <ItemIcon id={crop.productId} size={52} />
        <span>
          <strong>{crop.productName}</strong>
          <small>
            {draft.plants.toLocaleString()} planted · {draft.wateredPlants.toLocaleString()} watered
            · sell in {draft.outputCity}
          </small>
        </span>
      </div>
      <ResultFigure
        label="Profit with seed returns"
        tone={complete ? profitTone(result!.profit) : "even"}
        value={
          <output data-result="farm-profit">{complete ? coin(result!.profit) : <Missing />}</output>
        }
        note={
          complete
            ? `${profitWord(result!.profit)} · counts the seeds you get back`
            : "Plan the harvest and price it to see your profit"
        }
      />
      <ResultPair
        result="farm-cash"
        items={[
          { label: "Upfront silver", value: complete ? coin(result!.upfront) : na },
          { label: "Produce sells for", value: complete ? coin(result!.revenue) : na },
        ]}
      />
      {!complete && missing.length > 0 && (
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
            onClick={() => goToStep(draft.harvestPerPlant === null ? 1 : 2)}
          >
            {draft.harvestPerPlant === null ? "Set your harvest" : "Add prices"}{" "}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {result?.stale && (
        <StatusLine tone="stale">
          Includes prices over an hour old. Refresh before you buy.
        </StatusLine>
      )}
      {complete && (
        <ResultRows
          result="farm-rows"
          items={[
            {
              label: "Cash profit before seed returns",
              value: coin(result!.cashProfit),
              tone: profitTone(result!.cashProfit),
            },
            { label: "Seeds returned", value: number(result!.expectedSeeds) },
            { label: "Value of returned seeds", value: coin(result!.seedCredit) },
            { label: "Produce to harvest", value: number(result!.harvest) },
            { label: "Sale fees", value: coin(result!.fees) },
            { label: "Extra seed value from watering", value: coin(result!.focusBenefit) },
            { label: "Silver per focus", value: number(result!.incrementalPerFocus) },
          ]}
        />
      )}
      <p className={s.resultNote}>
        {complete
          ? `${[draft.seedPrice, draft.productPrice].some((p) => p.manual) ? "Includes prices you typed. " : "From observed prices with their times. "}`
          : ""}
        Profit counts the seeds you get back at the seed price, so it is more than the silver you
        hold after selling.
      </p>
      <div className={s.stack}>
        <Disclosure summary="How this is calculated">
          <div className={c.prose}>
            <p>
              Harvest is plants × your yield. Seeds returned are unwatered plants × the unwatered
              seed yield plus watered plants × the watered yield.
            </p>
            <p>
              Upfront silver is seeds, purchase fee and other costs. Cash profit is the produce sale
              after fees minus upfront silver; profit adds the returned seeds at the seed price.
              Silver per focus counts only the extra seeds from watering.
            </p>
            <p>
              One harvest with average yields. Seed sale fees, island upkeep, Premium, growing time
              and byproducts aren’t counted; add what matters under other costs.
            </p>
            <a
              className="pill-link"
              href="https://albiononline.com/news/guide-farming"
              target="_blank"
              rel="noreferrer"
            >
              Official farming guide
            </a>
          </div>
        </Disclosure>
      </div>
    </>
  );
  const details = (
    <div className={c.saved}>
      <Disclosure summary="Saved harvest scenarios & sharing">
        <ScenarioControls
          schema={farmingSchema}
          configuration={config}
          onLoad={(value) => {
            controller.current?.abort();
            setBusy(false);
            setDraft(value);
            if (value.region !== region) {
              document.cookie = `atlas-region=${value.region}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
              const url = new URL(window.location.href);
              url.searchParams.set("region", value.region);
              router.replace(url.pathname + url.search + url.hash, { scroll: false });
            }
          }}
        />
      </Disclosure>
    </div>
  );
  return (
    <div className={s.journey}>
      {picker && (
        <EditorDialog open title="Choose a crop" drawer onClose={() => setPicker(false)}>
          {browser}
        </EditorDialog>
      )}
      <CalculatorShell
        label="Farming workflow"
        step={step}
        onStep={goToStep}
        details={details}
        summary={{
          label: "Profit",
          tone: complete ? profitTone(result!.profit) : "even",
          value: complete ? (
            coin(result!.profit)
          ) : (
            <span className={s.summaryPending}>
              {missing.length
                ? `${missing.length} ${missing.length === 1 ? "input" : "inputs"} to go`
                : "Unavailable"}
            </span>
          ),
        }}
        steps={[
          {
            id: steps[0],
            label: "Plan harvest",
            title: "Crop and plan",
            line: "What you grow, how many you plant and water, and what each plant gives.",
            children: plan,
          },
          {
            id: steps[1],
            label: "Price it",
            title: "Prices",
            line: `Buy seeds in ${draft.materialCity} · sell produce in ${draft.outputCity}. Type any price to override it.`,
            actions: (
              <button
                type="button"
                className={`button secondary ${s.refresh}`}
                aria-label="Refresh market observations"
                aria-busy={busy}
                disabled={busy}
                onClick={refresh}
              >
                <RefreshCw size={15} aria-hidden="true" />
                {busy ? "Updating…" : "Refresh"}
              </button>
            ),
            children: pricesPanel,
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
