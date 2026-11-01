"use client";
import { CalculationReadiness } from "./calculation-readiness";
import { useRouter } from "next/navigation";
import { ScenarioControls } from "./scenario-controls";
import { useAtlasRegion } from "./region-context";
import { useState } from "react";
import { trade, tradeSchema, tradeScenarioSchema } from "@/lib/albion/calculations";
const fields = [
  { key: "buy", label: "Purchase price per item" },
  { key: "sell", label: "Sale price per item" },
  { key: "quantity", label: "Quantity" },
  { key: "tax", label: "Sales tax (%)" },
  { key: "fee", label: "Sell order setup fee (%)" },
  { key: "transport", label: "Total transport / risk cost" },
] as const;
export function TradeCalculator() {
  const region = useAtlasRegion(),
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
  const parsed = tradeSchema.safeParse(values);
  const result = parsed.success ? trade(parsed.data) : null;
  const missing = fields
    .filter((field) => Number.isNaN(values[field.key]))
    .map((field) => field.label);
  const [message, setMessage] = useState("");
  return (
    <>
      <div className="calculator-grid manual-trade-workspace">
        <section className="panel">
          <h2>Trade assumptions</h2>
          <div className="input-grid">
            <label>
              Purchase execution
              <select
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
                <option value="instant">Instant purchase</option>
                <option value="buy-order">Buy order</option>
              </select>
            </label>
            {fields
              .filter((f) => ["buy", "sell", "quantity"].includes(f.key))
              .map((f) => (
                <label key={f.key}>
                  {f.label}
                  <input
                    type="number"
                    min={f.key === "quantity" ? 1 : 0}
                    step={f.key === "quantity" ? 1 : "any"}
                    max={f.key === "tax" || f.key === "fee" ? 100 : undefined}
                    value={Number.isNaN(values[f.key]) ? "" : values[f.key]}
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [f.key]: e.target.value === "" ? NaN : Number(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
          </div>
          {!parsed.success && missing.length === 0 && (
            <p className="error" role="alert">
              Enter nonnegative prices, a positive whole quantity, and fees between 0% and 100%.
              Scenario cost and revenue must each be at most one trillion silver.
            </p>
          )}
          <p className="economy-assumption-readout">
            Applied: {Number.isFinite(values.tax) ? values.tax : "Check"}% tax ·{" "}
            {Number.isFinite(values.fee) ? values.fee : "Check"}% sell setup ·{" "}
            {values.buyMode === "buy-order"
              ? Number.isFinite(values.buyFee)
                ? values.buyFee
                : "Check"
              : 0}
            % buy setup ·{" "}
            {Number.isFinite(values.transport) ? values.transport.toLocaleString() : "Check"} silver
            transport/risk.
          </p>
          <details className="economy-assumptions">
            <summary>Fees & extra costs</summary>
            <div className="input-grid">
              <label>
                Purchase order setup fee (%)
                <input
                  aria-label="Purchase order setup fee (%)"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  disabled={values.buyMode !== "buy-order"}
                  value={Number.isNaN(values.buyFee) ? "" : values.buyFee}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      buyFee: e.target.value === "" ? NaN : Number(e.target.value),
                    })
                  }
                />
              </label>
              {fields
                .filter((f) => ["tax", "fee", "transport"].includes(f.key))
                .map((f) => (
                  <label key={f.key}>
                    {f.label}
                    <input
                      type="number"
                      min={f.key === "quantity" ? 1 : 0}
                      step={f.key === "quantity" ? 1 : "any"}
                      max={f.key === "tax" || f.key === "fee" ? 100 : undefined}
                      value={Number.isNaN(values[f.key]) ? "" : values[f.key]}
                      onChange={(e) =>
                        setValues({
                          ...values,
                          [f.key]: e.target.value === "" ? NaN : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
            </div>
            <p className="muted">
              Sales tax and sell setup fee apply to gross sale value. Buy-order setup applies to the
              full purchase value once; instant purchases have no modeled purchase setup fee.
              Transport is charged once per scenario. Repeated listing fees and unsold inventory are
              not modeled.
            </p>
          </details>
          <button
            className="button secondary"
            disabled={!result}
            onClick={() => {
              const blob = new Blob(
                [
                  JSON.stringify(
                    { kind: "albion-atlas-trade", version: 1, inputs: values, result },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              );
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "atlas-trade.json";
              a.click();
              URL.revokeObjectURL(a.href);
              setMessage("Scenario exported as JSON.");
            }}
          >
            Export scenario
          </button>
          <p role="status">{message}</p>
        </section>
        <section className="panel result">
          <h2>Estimated net profit</h2>
          {!result && (
            <CalculationReadiness
              title={missing.length ? "Add your trade prices" : "Check your trade assumptions"}
              missing={missing}
            >
              Enter the prices you expect to pay and receive. Fees are your configured assumptions;
              no market prices are loaded automatically.
            </CalculationReadiness>
          )}
          <strong
            className={
              !result || result.profit === 0
                ? "neutral"
                : result.profit < 0
                  ? "negative"
                  : "positive"
            }
          >
            {result ? result.profit.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
            <small> silver</small>
          </strong>
          {result && (
            <dl>
              <div>
                <dt>Break-even sale per item</dt>
                <dd>
                  {result.breakEven === null
                    ? "Unavailable within model limits"
                    : result.breakEven.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </dd>
              </div>
              <div>
                <dt>Minimum profitable whole-silver sale</dt>
                <dd>
                  {result.minimumProfitableSale === null
                    ? "Unavailable within model limits"
                    : result.minimumProfitableSale.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt>Purchase + fees + transport</dt>
                <dd>{result.cost.toLocaleString()}</dd>
              </div>
              {values.buyMode === "buy-order" && (
                <div>
                  <dt>Purchase order setup cost</dt>
                  <dd>{result.purchaseFees.toLocaleString()}</dd>
                </div>
              )}
              <div>
                <dt>Gross revenue</dt>
                <dd>{result.revenue.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Sale taxes + sell setup fees</dt>
                <dd>{result.fees.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Profit margin</dt>
                <dd>{result.margin === null ? "Unavailable" : `${result.margin.toFixed(2)}%`}</dd>
              </div>
              <div>
                <dt>Return on investment</dt>
                <dd>{result.roi === null ? "Unavailable" : `${result.roi.toFixed(2)}%`}</dd>
              </div>
            </dl>
          )}
          <p className="muted">
            Profit = sale proceeds − purchases − taxes − setup fees − transport. Break-even is shown
            to two decimals; the minimum whole-silver sale must yield positive unrounded profit
            within the model’s limits.
          </p>
        </section>
      </div>
      <details className="panel economy-saved-scenarios">
        <summary>Saved trade scenarios & sharing</summary>
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
      </details>
    </>
  );
}
