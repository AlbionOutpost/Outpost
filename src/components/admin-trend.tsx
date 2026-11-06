"use client";
import { AnimatedNumber } from "./animated-number";
import { useState } from "react";
import type { AdminOverview } from "@/lib/admin/queries";
import { PanelHead } from "./panel-head";
import { Disclosure } from "./disclosure";
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
    <section className="panel admin-trend" aria-labelledby="admin-growth">
      <PanelHead
        id="admin-growth"
        title={
          <>
            Community <em>growth</em>
          </>
        }
        line="New records over the last 30 days, UTC."
        actions={
          <span className="admin-chart-total">
            <strong>
              <AnimatedNumber value={total} />
            </strong>
            <small>{series[selected].toLowerCase()}</small>
          </span>
        }
      />
      <div className="admin-seg" role="group" aria-label="Chart series">
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
      <div className="admin-chart well">
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
              <stop stopColor="currentColor" stopOpacity=".26" />
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
          <span>Peak {peak} a day</span>
          <span>{data.at(-1)?.date}</span>
        </div>
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
        <p className="admin-note well">
          The chart and its 30-day sum cover up to 5,000 of the newest records per series. The
          totals above are counted separately.
        </p>
      )}
      <Disclosure summary="Daily values" meta="30 days">
        <div className="tool-table-scroll" tabIndex={0} role="region" aria-label="Daily values">
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
      </Disclosure>
    </section>
  );
}
