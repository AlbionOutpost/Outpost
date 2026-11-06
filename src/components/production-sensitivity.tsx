import type { productionSensitivity } from "@/lib/albion/production-sensitivity";
import s from "@/app/production-calculator.module.css";

/** How the run's profit moves if the unit sale price does: hypothetical, not a forecast. */
export function ProductionSensitivity({
  rows,
}: {
  rows: ReturnType<typeof productionSensitivity>;
}) {
  const money = (value: number | null) =>
    value === null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const signed = (value: number | null) =>
    value === null ? "—" : `${value > 0 ? "+" : value < 0 ? "−" : ""}${money(Math.abs(value))}`;
  // Cash profit only differs from profit when returned materials are valued.
  const cash = rows.some((row) => row.cashProfit !== row.profit);
  return (
    <div className={s.sensitivity}>
      <h3 id="production-sensitivity-title">If the sale price moves</h3>
      <div
        className={s.tableScroll}
        role="region"
        aria-label="Sale-price sensitivity scenarios"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Sale price</th>
              <th scope="col">Unit</th>
              <th scope="col">Profit</th>
              {cash && <th scope="col">Cash profit</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.percent} data-current={row.percent === 100 ? "" : undefined}>
                <th scope="row">
                  {row.percent === 100
                    ? "Now"
                    : `${row.percent - 100 > 0 ? "+" : "−"}${Math.abs(row.percent - 100)}%`}
                </th>
                <td>{money(row.price)}</td>
                <td
                  className={
                    row.profit === null ? undefined : row.profit < 0 ? "is-loss" : "is-gain"
                  }
                >
                  {signed(row.profit)}
                </td>
                {cash && <td>{signed(row.cashProfit)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>Everything else stays as you entered it. Silver for the whole run.</p>
    </div>
  );
}
