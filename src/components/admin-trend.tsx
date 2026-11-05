"use client";
import { AnimatedNumber } from "./animated-number";
import { useState } from "react";
import type { AdminOverview } from "@/lib/admin/queries";
const series = { accounts: "New accounts", builds: "New builds", comps: "New comps" } as const;
export function AdminTrend({ data, limited }: { data: AdminOverview["trend"]; limited: boolean }) {
  const [selected, setSelected] = useState<keyof typeof series>("accounts");
  const [day, setDay] = useState(29);
  const point = data[day];
  const peak = Math.max(0, ...data.map((d) => d[selected])),
    max = Math.max(1, peak),
    total = data.reduce((n, d) => n + d[selected], 0);
  const points = data
    .map((d, i) => `${28 + (i * 724) / 29},${188 - (d[selected] * 156) / max}`)
    .join(" ");
  return (
    <section className="admin-surface admin-trend">
      <div className="admin-section-head">
        <div>
          <h2>Community growth</h2>
          <p>New records over the last 30 days · UTC</p>
        </div>
        <span className="admin-chart-total">
          <AnimatedNumber value={total} /> <small>{series[selected].toLowerCase()}</small>
        </span>
      </div>
      <div className="admin-tabs" role="group" aria-label="Chart series">
        {Object.entries(series).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={key === selected}
            onClick={() => setSelected(key as keyof typeof series)}
          >
            {label}
          </button>
        ))}
      </div>
      <svg
        viewBox="0 0 780 220"
        role="img"
        aria-label={`${series[selected]}: ${total} over 30 days`}
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const index = Math.round(
            ((((event.clientX - box.left) / box.width) * 780 - 28) / 724) * 29,
          );
          setDay(Math.max(0, Math.min(29, index)));
        }}
      >
        <defs>
          <linearGradient id="admin-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="currentColor" stopOpacity=".22" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[32, 84, 136, 188].map((y) => (
          <line key={y} x1="28" x2="752" y1={y} y2={y} className="admin-grid-line" />
        ))}
        <polygon points={`28,188 ${points} 752,188`} fill="url(#admin-chart-fill)" />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <line
          x1={28 + (day * 724) / 29}
          x2={28 + (day * 724) / 29}
          y1="32"
          y2="188"
          className="admin-chart-cursor"
        />
        <circle
          cx={28 + (day * 724) / 29}
          cy={188 - (point[selected] * 156) / max}
          r="4"
          fill="currentColor"
        />
      </svg>
      <div className="admin-chart-axis">
        <span>{data[0].date}</span>
        <span>Peak {peak} / day</span>
        <span>{data.at(-1)?.date}</span>
      </div>
      <div className="admin-chart-inspector">
        <label htmlFor="admin-chart-day">Inspect a day</label>
        <output htmlFor="admin-chart-day">
          {point.date} ·{" "}
          <strong>
            {point[selected]} {series[selected].toLowerCase()}
          </strong>
        </output>
        <input
          id="admin-chart-day"
          type="range"
          min="0"
          max="29"
          value={day}
          onChange={(event) => setDay(Number(event.target.value))}
          aria-valuetext={`${point.date}: ${point[selected]} ${series[selected].toLowerCase()}`}
        />
      </div>
      {limited && (
        <p className="admin-notice">
          Chart and its 30-day sum show up to 5,000 newest records per series. The overview account
          and content totals are counted independently without this cap.
        </p>
      )}
      <details className="admin-chart-data">
        <summary>View daily values</summary>
        <div className="admin-table-scroll">
          <table>
            <caption>{series[selected]} per day, UTC</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Count</th>
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
      </details>
    </section>
  );
}
