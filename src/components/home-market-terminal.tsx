"use client";

import Image from "next/image";
import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "@/components/link";
import { ChartNoAxesCombined, ArrowUpRight, Shield, Users, Coins } from "lucide-react";
import { z } from "zod";
import { CatalogItemPicker } from "./catalog-item-picker";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { ItemIcon } from "./item-icon";
import { useAtlasRegion } from "./region-context";
import { regions } from "@/lib/albion/region-config";
import {
  observationLabel,
  parseMarketPreview,
  type PreviewPrice,
} from "@/lib/albion/market-preview";
import { sourceTimestamp } from "@/lib/albion/freshness";

const historySchema = z.object({
  region: z.string(),
  data: z
    .array(
      z.object({
        item_id: z.string(),
        location: z.string(),
        quality: z.literal(1),
        data: z
          .array(
            z.object({
              avg_price: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER),
              item_count: z.number().nonnegative(),
              timestamp: z.string().max(64),
            }),
          )
          .max(1000),
      }),
    )
    .max(100),
});
type Point = { price: number; timestamp: number };
const silver = (n: number) => n.toLocaleString("en-GB", { maximumFractionDigits: 2 });
const date = (n: number) =>
  new Date(n).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function HomeMarketTerminal({
  hero,
  children,
  afterPreview,
}: { hero?: ReactNode; children?: ReactNode; afterPreview?: ReactNode } = {}) {
  const region = useAtlasRegion();
  const [item, setItem] = useState("T4_BAG");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const gradient = useId().replaceAll(":", "");
  const [city, setCity] = useState("Lymhurst");
  const [days, setDays] = useState(30);
  const [history, setHistory] = useState<{
    key: string;
    points: Point[];
    error: boolean;
    asOf: number;
  } | null>(null);
  const [market, setMarket] = useState<{
    key: string;
    rows: PreviewPrice[];
    error: boolean;
  } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const identity = `${region}:${item}:${city}`;
  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10000);
    fetch(`/api/market?${new URLSearchParams({ region, item, quality: "1", view: "overview" })}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return parseMarketPreview(await response.json(), region, item);
      })
      .then((rows) => {
        if (!controller.signal.aborted) setMarket({ key: `${region}:${item}`, rows, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted || timedOut)
          setMarket({ key: `${region}:${item}`, rows: [], error: true });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [region, item, revision]);
  useEffect(() => {
    if (!sourceOpen) return;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10000);
    fetch(
      `/api/history?${new URLSearchParams({ kind: "history", region, item, city, quality: "1" })}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = historySchema.parse(await response.json());
        if (
          data.region !== region ||
          data.data.some((row) => row.location !== city || row.item_id !== item)
        )
          throw new Error();
        const points = data.data
          .flatMap((row) => row.data)
          .map((p) => ({ price: p.avg_price, timestamp: sourceTimestamp(p.timestamp) }))
          .filter(
            (p) =>
              p.price > 0 &&
              Number.isFinite(p.timestamp) &&
              p.timestamp > 0 &&
              p.timestamp <= Date.now() + 300000,
          )
          .sort((a, b) => a.timestamp - b.timestamp);
        if (points.length > 1000 || new Set(points.map((p) => p.timestamp)).size !== points.length)
          throw new Error();
        if (!controller.signal.aborted)
          setHistory({ key: identity, points, error: false, asOf: Date.now() });
      })
      .catch(() => {
        if (!controller.signal.aborted || timedOut)
          setHistory({ key: identity, points: [], error: true, asOf: Date.now() });
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [region, item, city, identity, revision, sourceOpen]);
  const active = history?.key === identity ? history : null;
  const points = active?.points.filter((p) => p.timestamp >= active.asOf - days * 86400000) ?? [];
  const rows =
    market?.key === `${region}:${item}`
      ? market.rows.filter((r) => r.city !== "Black Market").slice(0, 4)
      : [];
  const min = points.length ? Math.min(...points.map((p) => p.price)) : 0;
  const max = points.length ? Math.max(...points.map((p) => p.price)) : 0;
  const spread = Math.max(max - min, max * 0.04, 1);
  const lower = Math.max(0, min - spread * 0.2),
    upper = max + spread * 0.2;
  const start = points[0]?.timestamp ?? 0,
    end = points.at(-1)?.timestamp ?? 1;
  const x = (p: Point) => 48 + ((p.timestamp - start) / Math.max(1, end - start)) * 390;
  const y = (p: Point) => 190 - ((p.price - lower) / Math.max(1, upper - lower)) * 160;
  const path = points
    .map(
      (p, i) =>
        `${i && p.timestamp - points[i - 1].timestamp <= 36 * 3600000 ? "L" : "M"}${x(p)},${y(p)}`,
    )
    .join(" ");
  const selected = points[hover ?? points.length - 1];
  const terminal = (
    <section className="home-terminal" aria-label="Observed market overview">
      <div className="home-market-query">
        <div className="terminal-toolbar">
          <span>
            <ChartNoAxesCombined size={18} aria-hidden="true" /> Check the market
          </span>
          <span>
            {regions[region].label} <span className="terminal-dot" /> AODP
          </span>
        </div>
        <div className="terminal-search">
          <CatalogItemPicker
            onSelect={(selected) => {
              setItem(selected.id);
              setHover(null);
            }}
          />
        </div>
        <div className="home-market-shortcuts" role="group" aria-label="Quick item selection">
          {[
            { id: "T4_MAIN_AXE", name: "Battleaxe" },
            { id: "T4_BAG", name: "Bag" },
            { id: "T4_CAPE", name: "Cape" },
          ].map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={item === entry.id}
              onClick={() => {
                setItem(entry.id);
                setHover(null);
              }}
            >
              {entry.name}
            </button>
          ))}
        </div>
        <div className="terminal-item">
          <ItemIcon id={item} size={66} />
          <div>
            <h2>{equipmentName(item)}</h2>
            <span>
              <b>Normal quality</b>
            </span>
          </div>
          <Link href={`/tools/market?region=${region}&item=${item}`} aria-label="Explore market">
            Explore market <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <details
          className="terminal-source"
          onToggle={(event) => setSourceOpen(event.currentTarget.open)}
        >
          <summary>Price history & source dates</summary>{" "}
          <div className="terminal-history">
            <div className="terminal-chart-heading">
              <div>
                <strong>Price history</strong>
                <span>Daily sell-order averages · silver</span>
              </div>
              <div className="terminal-period" role="group" aria-label="History range">
                {[7, 30].map((n) => (
                  <button
                    key={n}
                    aria-pressed={days === n}
                    onClick={() => {
                      setDays(n);
                      setHover(null);
                    }}
                  >
                    {n}d
                  </button>
                ))}
              </div>
            </div>
            <div className="terminal-chart-area">
              {points.length > 0 ? (
                <>
                  <svg
                    viewBox="0 0 460 226"
                    role="img"
                    aria-label={`${city}: ${points.length} observed daily sell-order averages, ${silver(min)} to ${silver(max)} silver. Full values below.`}
                    onMouseLeave={() => setHover(null)}
                  >
                    <defs>
                      <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-ink)" stopOpacity=".22" />
                        <stop offset="100%" stopColor="var(--accent-ink)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map((i) => {
                      const value = lower + ((upper - lower) * i) / 3;
                      const py = 190 - (i * 160) / 3;
                      return (
                        <g key={i}>
                          <line x1="48" x2="438" y1={py} y2={py} className="chart-gridline" />
                          <text x="40" y={py + 4} textAnchor="end">
                            {value.toLocaleString("en-GB", {
                              notation: "compact",
                              maximumFractionDigits: 2,
                            })}
                          </text>
                        </g>
                      );
                    })}
                    {points.length > 1 &&
                      points.every(
                        (p, i) => !i || p.timestamp - points[i - 1].timestamp <= 36 * 3600000,
                      ) && (
                        <path
                          d={`${path} L${x(points.at(-1)!)},190 L48,190 Z`}
                          fill={`url(#${gradient})`}
                        />
                      )}
                    <path
                      d={path}
                      fill="none"
                      stroke="var(--accent-ink)"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                    {points.map((p, i) => (
                      <circle
                        key={p.timestamp}
                        cx={x(p)}
                        cy={y(p)}
                        r={hover === i ? 4 : 9}
                        style={{
                          fillOpacity: hover === i ? 1 : 0,
                          strokeOpacity: hover === i ? 1 : 0,
                          pointerEvents: "all",
                        }}
                        className="chart-observation"
                        onMouseEnter={() => setHover(i)}
                      >
                        <title>
                          {date(p.timestamp)} UTC: {silver(p.price)} silver
                        </title>
                      </circle>
                    ))}
                    <text x="48" y="216">
                      {date(start)}
                    </text>
                    <text x="438" y="216" textAnchor="end">
                      {date(end)}
                    </text>
                  </svg>
                  <div className="terminal-chart-value">
                    <strong className="numeric">{silver(selected?.price ?? 0)}</strong>
                    <span>{selected ? date(selected.timestamp) : ""} UTC · observed average</span>
                  </div>
                </>
              ) : (
                <div className="terminal-chart-empty" role="status">
                  <ChartNoAxesCombined size={34} />
                  <strong>
                    {!active
                      ? "Loading market history…"
                      : active.error
                        ? "History is temporarily unavailable"
                        : "No observations in this range"}
                  </strong>
                  <span>
                    {!active
                      ? "Requesting source observations"
                      : "Open the market explorer to try another item or city."}
                  </span>
                </div>
              )}
            </div>
            <div className="terminal-chart-controls">
              <label>
                History city{" "}
                <select
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setHover(null);
                  }}
                >
                  {[
                    "Lymhurst",
                    "Bridgewatch",
                    "Caerleon",
                    "Fort Sterling",
                    "Martlock",
                    "Thetford",
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <span>Source times · UTC</span>
            </div>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setHistory(null);
              setMarket(null);
              setRevision((n) => n + 1);
            }}
          >
            Refresh observations
          </button>
          <p>
            Albion Online Data Project · daily sell-order averages, not confirmed trades. Missing
            dates stay unfilled. Quote ages are shown separately.
          </p>
          {!!rows.length && (
            <ul className="terminal-quote-times">
              {rows.map((row) => (
                <li key={row.city}>
                  {row.city}:{" "}
                  {[
                    [row.sell_price_min, row.sell_price_min_date, "sell"],
                    [row.buy_price_max, row.buy_price_max_date, "buy"],
                  ].map(([value, stamp, side]) => {
                    const observation = observationLabel(Number(value), String(stamp));
                    return (
                      <span key={side}>
                        {side}:{" "}
                        {observation.dateTime ? (
                          <time dateTime={observation.dateTime}>
                            {observation.dateTime.replace("T", " ").replace(".000Z", " UTC")}
                          </time>
                        ) : (
                          observation.label
                        )}{" "}
                      </span>
                    );
                  })}
                </li>
              ))}
            </ul>
          )}
          {!!points.length && (
            <div
              className="table-scroll"
              role="region"
              aria-label="Market overview source observations"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Observed date (UTC)</th>
                    <th>Average silver</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.timestamp}>
                      <td>{date(p.timestamp)}</td>
                      <td>{p.price.toLocaleString("en-GB", { maximumFractionDigits: 20 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>
      </div>
      <div className="home-market-observations">
        <h2>Market snapshot</h2>
        <p>{regions[region].label} · Normal quality · Player observations</p>
        <div className="terminal-city-prices">
          {rows.map((row) => (
            <div className="home-city-quote" key={row.city}>
              <ItemIcon id={item} size={44} />
              <span className="terminal-city-name">
                <span className={`city-mark city-${row.city.toLowerCase().replaceAll(" ", "-")}`} />
                {row.city}
              </span>
              {[
                [row.sell_price_min, row.sell_price_min_date],
                [row.buy_price_max, row.buy_price_max_date],
              ].map(([value, stamp], i) => {
                const observed = observationLabel(Number(value), String(stamp));
                return (
                  <span key={i} className="numeric" title={observed.dateTime ?? observed.label}>
                    <span className="home-quote-side">
                      {i === 0 ? "Sell listing" : "Buy order"}
                    </span>
                    <strong>{Number(value) > 0 ? silver(Number(value)) : "—"}</strong>
                    <small>{observed.label}</small>
                  </span>
                );
              })}
            </div>
          ))}
          {!rows.length && (
            <div className="home-price-recovery">
              <p className="muted">
                {market?.key !== `${region}:${item}`
                  ? "Loading city quotes…"
                  : market.error
                    ? "City prices could not be loaded. Refresh observations to retry."
                    : "No city quotes were returned for this item and quality. Try another item."}
              </p>
              {market?.key === `${region}:${item}` && (
                <div className="actions">
                  {market.error && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setRevision((n) => n + 1)}
                    >
                      Retry price preview
                    </button>
                  )}
                  <Link
                    className="text-link"
                    href={`/tools/market?region=${region}&item=${item}&quality=1`}
                  >
                    Open full market <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
  if (!hero) return terminal;
  return (
    <div className="home-reference-composition">
      <section className="reference-hero" aria-labelledby="home-title">
        {hero}
        <div className="home-hero-atmosphere" aria-hidden="true">
          <Image
            src="/albion/illustrations/city-overlook-v2.webp"
            alt=""
            fill
            unoptimized
            preload
            sizes="100vw"
          />
        </div>
      </section>
      {children}
      {terminal}
      {afterPreview}
    </div>
  );
}

export function HomeCompPreview() {
  return (
    <div className="home-comp-preview">
      <div>
        <Shield size={18} />
        <strong>Frontline</strong>
        <ItemIcon id="T4_OFF_SHIELD" size={48} />
        <ItemIcon id="T4_MAIN_AXE" size={48} />
      </div>
      <div>
        <Users size={18} />
        <strong>Party loadouts</strong>
        <ItemIcon id="T4_HEAD_CLOTH_SET1" size={48} />
        <ItemIcon id="T4_ARMOR_LEATHER_SET1" size={48} />
        <ItemIcon id="T4_SHOES_LEATHER_SET1" size={48} />
      </div>
      <p>Equipment preview · choose roles and swaps in your comp.</p>
    </div>
  );
}
export function HomeEconomyPreview() {
  return (
    <div className="home-economy-preview">
      {[
        { id: "T4_BAG", name: "City prices", hint: "Compare buy & sell orders" },
        { id: "T4_MAIN_AXE", name: "Crafting costs", hint: "Account for materials & fees" },
        { id: "T4_CAPE", name: "Trade planning", hint: "Check costs before travelling" },
      ].map((row) => (
        <div key={row.name}>
          <ItemIcon id={row.id} size={42} />
          <div>
            <strong>{row.name}</strong>
            <span>{row.hint}</span>
          </div>
          <Coins size={15} />
        </div>
      ))}
    </div>
  );
}
