"use client";
import { useState } from "react";
import type { AdminOverview } from "@/lib/admin/queries";
import { PanelHead } from "./panel-head";
import { ChevronDown } from "lucide-react";
const series = { accounts: "New accounts", builds: "New builds", comps: "New comps" } as const;
const short = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

/**
 * New records per UTC day over 30 days as one series of bars (counts are small and discrete, so
 * bars read better than a line). Hover or focus a bar for its day; the daily table is the
 * keyboard and screen-reader view. With nothing new in any series, one line replaces the chart.
 */
export function AdminTrend({ data, limited }: { data: AdminOverview["trend"]; limited: boolean }) {
  const [selected, setSelected] = useState<keyof typeof series>("accounts");
  const [day, setDay] = useState<number | null>(null);
  const [values, setValues] = useState(false);
  const empty = data.every((d) => !d.accounts && !d.builds && !d.comps);
  const max = Math.max(1, ...data.map((d) => d[selected])),
    total = data.reduce((n, d) => n + d[selected], 0);
  const shown = day === null ? null : data[day];
  const step = 724 / 30;
  return (
    <section className="panel admin-trend" aria-labelledby="admin-growth">
      <PanelHead
        id="admin-growth"
        title={
          <>
            Last 30 <em>days</em>
          </>
        }
        line={
          empty
            ? "No new accounts, builds or comps in the last 30 days."
            : shown
              ? `${short(shown.date)}: ${shown[selected]} ${series[selected].toLowerCase()}`
              : `${total.toLocaleString("en-GB")} ${series[selected].toLowerCase()} in 30 days, UTC.`
        }
      />
      {!empty && (
        <>
          <div className="admin-controls">
            <div className="segmented admin-seg" role="group" aria-label="Chart series">
              {Object.entries(series).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={key === selected}
                  onClick={() => setSelected(key as keyof typeof series)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="pill-link is-small"
              aria-expanded={values}
              aria-controls="admin-daily-values"
              onClick={() => setValues((v) => !v)}
            >
              Daily values{" "}
              <ChevronDown size={15} aria-hidden="true" data-open={values || undefined} />
            </button>
          </div>
          <div className="admin-chart well">
            <svg
              viewBox="0 0 780 180"
              role="img"
              aria-label={`${series[selected]}: ${total} over 30 days`}
              onPointerLeave={() => setDay(null)}
            >
              <line x1="28" x2="752" y1="152" y2="152" className="admin-grid-line" />
              <line x1="28" x2="752" y1="16" y2="16" className="admin-grid-line is-faint" />
              {data.map((d, i) => {
                const h = (d[selected] * 136) / max;
                return (
                  <g key={d.date} onPointerEnter={() => setDay(i)}>
                    <rect
                      x={28 + i * step}
                      y="16"
                      width={step}
                      height="136"
                      className="admin-chart-hit"
                    />
                    {d[selected] > 0 && (
                      <rect
                        x={28 + i * step + 2}
                        y={152 - h}
                        width={step - 4}
                        height={h}
                        rx="3"
                        className="admin-chart-bar"
                        data-active={day === i || undefined}
                      />
                    )}
                  </g>
                );
              })}
            </svg>
            <div className="admin-chart-axis">
              <span>{short(data[0].date)}</span>
              <span>Top line {max} a day</span>
              <span>{short(data.at(-1)!.date)}</span>
            </div>
          </div>
          {limited && (
            <p className="admin-note well">
              The chart covers up to 5,000 of the newest records per series. The totals above are
              counted separately.
            </p>
          )}
          {values && (
            <div id="admin-daily-values">
              <div
                className="tool-table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Daily values"
              >
                <table className="tool-table admin-table">
                  <caption className="sr-only">{series[selected]} per day, UTC</caption>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>{series[selected]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d) => (
                      <tr key={d.date}>
                        <th scope="row">{d.date}</th>
                        <td>{d[selected]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
