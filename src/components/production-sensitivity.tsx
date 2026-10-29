import type { ProductionInput } from "@/lib/albion/production";
import { productionSensitivity } from "@/lib/albion/production-sensitivity";

export function ProductionSensitivity({ configuration }: { configuration: ProductionInput }) {
  const rows = productionSensitivity(configuration);
  if (!rows.length) return null;
  const money = (value: number | null) =>
    value === null ? "Unavailable" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (
    <section
      className="panel production-sensitivity"
      aria-labelledby="production-sensitivity-title"
    >
      <h2 id="production-sensitivity-title">Sale-price sensitivity</h2>
      <p>
        How this run changes if your unit sale price moves. All other inputs stay fixed. These are
        hypothetical scenarios, not price forecasts.
      </p>
      <div
        className="table-scroll"
        role="region"
        aria-label="Sale-price sensitivity scenarios"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th>Sale-price scenario</th>
              <th>Unit sale price · silver</th>
              <th>Economic profit · silver</th>
              <th>Cash profit · silver</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.percent}
                className={row.percent === 100 ? "sensitivity-current" : undefined}
              >
                <th scope="row">
                  {row.percent === 100
                    ? "Current input"
                    : `${row.percent - 100 > 0 ? "+" : ""}${row.percent - 100}%`}
                </th>
                <td>{money(row.price)}</td>
                <td
                  className={
                    row.profit === null ? "neutral" : row.profit < 0 ? "negative" : "positive"
                  }
                >
                  {money(row.profit)}
                </td>
                <td>{money(row.cashProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
