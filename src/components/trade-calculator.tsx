"use client";
import { AnimatedNumber } from "./animated-number";
import { useRouter } from "next/navigation";
import { ScenarioControls } from "./scenario-controls";
import { useOutpostRegion } from "./region-context";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { trade, tradeSchema, tradeScenarioSchema } from "@/lib/albion/calculations";
import {
  CalculatorShell,
  ResultFigure,
  ResultPair,
  ResultRows,
  useCalculatorStep,
} from "./calculator-shell";
import { coin, profitTone, profitWord, Missing } from "./calculator-figures";
import { Disclosure } from "./disclosure";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
import s from "./calculator-shell.module.css";
import c from "@/app/calculators.module.css";
import { NumberField } from "./number-field";
const fields = [
  { key: "buy", label: "Purchase price per item" },
  { key: "sell", label: "Sale price per item" },
  { key: "quantity", label: "Quantity" },
  { key: "tax", label: "Sales tax (%)" },
  { key: "fee", label: "Sell order setup fee (%)" },
  { key: "transport", label: "Total transport / risk cost" },
] as const;
const steps = ["trade-inputs", "trade-result"];
export function TradeCalculator() {
  const region = useOutpostRegion(),
    router = useRouter();
  const [values, setValues] = useState({
    buy: NaN,
    buyMode: "instant" as "instant" | "buy-order",
    buyFee: 0,
    sell: NaN,
    quantity: 1,
    tax: 0,
    fee: 0,
    transport: 0,
  });
  const [step, goToStep] = useCalculatorStep(steps);
  const parsed = tradeSchema.safeParse(values);
  const result = parsed.success ? trade(parsed.data) : null;
  const missing = fields
    .filter((field) => Number.isNaN(values[field.key]))
    .map((field) => field.label);
  const [message, setMessage] = useState("");
  const input = (f: (typeof fields)[number], wide = false) => (
    <label key={f.key} className={wide ? s.wide : undefined}>
      {f.label}
      <NumberField
        min={f.key === "quantity" ? 1 : 0}
        decimals={f.key === "quantity" ? 0 : 2}
        silver={f.key === "buy" || f.key === "sell" || f.key === "transport"}
        max={f.key === "tax" || f.key === "fee" ? 100 : undefined}
        placeholder={f.key === "buy" || f.key === "sell" ? "Price" : undefined}
        value={Number.isNaN(values[f.key]) ? "" : values[f.key]}
        onValueChange={(v) =>
          setValues({
            ...values,
            [f.key]: v ?? NaN,
          })
        }
      />
    </label>
  );
  const number = (n: number | null, suffix = "") =>
    n === null ? (
      <Unavailable />
    ) : (
      <AnimatedNumber value={n} digits={2} minimumDigits={0} suffix={suffix} />
    );
  const saved = (
    <Disclosure summary="Saved trade scenarios & sharing">
      <ScenarioControls
        schema={tradeScenarioSchema}
        configuration={{ ...values, kind: "flipping", region }}
        onLoad={(value) => {
          setValues(value);
          if (value.region !== region) {
            document.cookie = `atlas-region=${value.region}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
            const url = new URL(location.href);
            url.searchParams.set("region", value.region);
            router.replace(url.pathname + url.search + url.hash, { scroll: false });
          }
        }}
      />
    </Disclosure>
  );
  const inputs = (
    <>
      <div className={s.fields}>
        <label>
          Purchase execution
          <WellSelect
            aria-label="Purchase execution"
            value={values.buyMode}
            onChange={(e) =>
              setValues({
                ...values,
                buyMode: e.target.value === "buy-order" ? "buy-order" : "instant",
                buyFee: e.target.value === "buy-order" ? values.buyFee : 0,
              })
            }
          >
            <option value="instant">Buy from a sell order</option>
            <option value="buy-order">Place a buy order</option>
          </WellSelect>
        </label>
        {input(fields[2])}
        {input(fields[0])}
        {input(fields[1])}
        {values.buyMode === "buy-order" && (
          <label>
            Purchase order setup fee (%)
            <NumberField
              aria-label="Purchase order setup fee (%)"
              min={0}
              max={100}
              decimals={2}
              value={Number.isNaN(values.buyFee) ? "" : values.buyFee}
              onValueChange={(v) =>
                setValues({
                  ...values,
                  buyFee: v ?? NaN,
                })
              }
            />
          </label>
        )}
      </div>
      {!parsed.success && missing.length === 0 && (
        <p className={s.alert} role="alert">
          Use prices of zero or more, a whole quantity of at least one and fees from 0% to 100%.
        </p>
      )}
      <div className={s.stack}>
        <Disclosure
          summary="Fees & extra costs"
          meta={
            <span data-assumptions="">
              {Number.isFinite(values.tax) ? values.tax : "Check"}% tax ·{" "}
              {Number.isFinite(values.fee) ? values.fee : "Check"}% setup
            </span>
          }
        >
          <div className={s.fields}>
            {input(fields[3])}
            {input(fields[4])}
            {input(fields[5], true)}
            <p className={s.help}>
              Tax and the sell order setup fee come off the sale. A buy order’s setup fee is paid
              once on the purchase. Transport and risk are counted once for the whole trade.
            </p>
          </div>
        </Disclosure>
        <Disclosure summary="How this is calculated">
          <div className={c.prose}>
            <p>Profit is the sale, minus what you paid, tax, setup fees and transport.</p>
            <p>
              Break-even is the sale price per item where profit is zero. The lowest sale price that
              profits is the first whole-silver price above it.
            </p>
            <p>Relisting fees and items that don’t sell aren’t counted.</p>
          </div>
        </Disclosure>
        {saved}
      </div>
    </>
  );
  const na = (
    <span className={s.na}>
      <Unavailable />
    </span>
  );
  const results = (
    <>
      <ResultFigure
        label="Net profit"
        tone={result ? profitTone(result.profit) : "even"}
        value={
          <output aria-label="Estimated net profit" data-result="trade-profit">
            {result ? coin(result.profit) : <Missing />}
          </output>
        }
        note={
          result
            ? `${profitWord(result.profit)} for ${values.quantity.toLocaleString()} ${values.quantity === 1 ? "item" : "items"}`
            : "Type both prices to see your profit"
        }
        aside={{
          label: "Margin",
          value: result?.margin != null ? number(result.margin, "%") : <Missing />,
        }}
      />
      <ResultPair
        result="trade-cash"
        items={[
          { label: "You pay", value: result ? coin(result.cost) : na },
          { label: "Sells for", value: result ? coin(result.revenue) : na },
        ]}
      />
      {!result && missing.length > 0 && (
        <div className={s.readiness} data-result="readiness" role="status">
          <strong>
            {missing.length} {missing.length === 1 ? "price" : "prices"} to go
          </strong>
          <ul>
            {missing.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          <button type="button" className="button secondary" onClick={() => goToStep(1)}>
            Add prices <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
      {result && (
        <ResultRows
          result="trade-rows"
          items={[
            { label: "Break-even sale per item", value: number(result.breakEven) },
            {
              label: "Lowest sale price that profits",
              value: number(result.minimumProfitableSale),
            },
            ...(values.buyMode === "buy-order"
              ? [{ label: "Purchase order setup cost", value: coin(result.purchaseFees) }]
              : []),
            { label: "Tax and sell setup fees", value: coin(result.fees) },
            {
              label: "Return on investment",
              value: number(result.roi, "%"),
              tone: profitTone(result.roi),
            },
          ]}
        />
      )}
      <button
        className={`button secondary ${c.start}`}
        disabled={!result}
        onClick={() => {
          const blob = new Blob(
            [
              JSON.stringify(
                { kind: "albion-outpost-trade", version: 1, inputs: values, result },
                null,
                2,
              ),
            ],
            { type: "application/json" },
          );
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "albion-outpost-trade.json";
          a.click();
          URL.revokeObjectURL(a.href);
          setMessage("Scenario exported as JSON.");
        }}
      >
        Export scenario
      </button>
      {message && <StatusLine>{message}</StatusLine>}
    </>
  );
  return (
    <div className={s.journey}>
      <CalculatorShell
        label="Trade check"
        step={step}
        onStep={goToStep}
        steps={[
          {
            id: steps[0],
            label: "Prices",
            title: "Your trade",
            line: "What you pay, what you sell for and how many. Nothing here loads from the market.",
            children: inputs,
          },
          {
            id: steps[1],
            label: "Review profit",
            title: "Profit",
            children: results,
          },
        ]}
      />
    </div>
  );
}
