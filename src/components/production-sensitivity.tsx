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
              <th scope="col">Cash profit</th>
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
                <td data-tone={row.profit === null ? undefined : row.profit < 0 ? "loss" : "gain"}>
                  {money(row.profit)}
                </td>
                <td>{money(row.cashProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>Everything else stays as you entered it. Silver for the whole run.</p>
    </div>
  );
}
