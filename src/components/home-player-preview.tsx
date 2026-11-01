"use client";
import { useEffect, useRef, useState } from "react";
import Link from "@/components/link";
import { ItemIcon } from "./item-icon";
import { CatalogItemPicker } from "./catalog-item-picker";
import { useAtlasRegion } from "./region-context";
import { regions } from "@/lib/albion/region-config";
import {
  parseMarketPreview,
  observationLabel,
  type PreviewPrice,
} from "@/lib/albion/market-preview";
const example = [
  { slot: "Helmet", id: "T4_HEAD_CLOTH_SET1", name: "Scholar Cowl" },
  { slot: "Cape", id: "T4_CAPE", name: "Cape" },
  { slot: "Chest", id: "T4_ARMOR_LEATHER_SET1", name: "Mercenary Jacket" },
  { slot: "Bag", id: "T4_BAG", name: "Bag" },
  { slot: "Main hand", id: "T4_MAIN_AXE", name: "Battleaxe" },
  { slot: "Boots", id: "T4_SHOES_LEATHER_SET1", name: "Mercenary Shoes" },
  { slot: "Off hand", id: "T4_OFF_SHIELD", name: "Shield" },
];
export function HomeEquipmentPreview({
  region,
  compact = false,
  detailArt = false,
}: {
  region: string;
  compact?: boolean;
  detailArt?: boolean;
}) {
  const [selected, setSelected] = useState(example[4]);
  return (
    <aside
      className={`home-loadout${compact ? " home-loadout-compact" : ""}`}
      aria-label="Example equipment preview"
    >
      {!compact && (
        <div className="section-heading">
          <h2>Plan your next set</h2>
          <span className="example-label">Equipment preview</span>
        </div>
      )}
      <div className="home-gear-grid">
        {example.map((item, i) => (
          <button
            key={item.slot}
            type="button"
            className={`home-gear-slot home-gear-${i}`}
            aria-label={`Preview ${item.slot}: ${item.name}`}
            aria-pressed={selected.id === item.id}
            onClick={() => setSelected(item)}
          >
            <ItemIcon id={item.id} size={76} />
            <span>{item.slot}</span>
          </button>
        ))}
      </div>
      <div className="home-item-caption">
        {detailArt && <ItemIcon id={selected.id} size={112} />}
        <div>
          <strong>{selected.name}</strong>
          <span>T4 · {selected.slot}</span>
        </div>
        <Link className="text-link" href={`/builds/new?region=${region}`}>
          Create your build →
        </Link>
      </div>
      <p className="muted">An equipment example, not a current meta recommendation.</p>
    </aside>
  );
}
function PreviewQuote({ value, date }: { value: number; date: string }) {
  const observation = observationLabel(value, date);
  return (
    <td>
      <strong className="numeric">
        {value > 0 ? value.toLocaleString("en-GB", { maximumFractionDigits: 20 }) : "Unavailable"}
      </strong>
      {value > 0 && (
        <span className={`home-quote-age${observation.label !== "Recent" ? " uncertain" : ""}`}>
          {observation.label}
          {observation.dateTime && (
            <time dateTime={observation.dateTime}>
              {observation.dateTime.slice(5, 16).replace("T", " ")} UTC
            </time>
          )}
        </span>
      )}
    </td>
  );
}

export function HomeMarketSearch() {
  const region = useAtlasRegion();
  const [item, setItem] = useState({ id: "T4_BAG", name: "Bag · T4.0" });
  const [result, setResult] = useState<{ key: string; rows: PreviewPrice[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const key = `${region}:${item.id}`;
  useEffect(() => () => controller.current?.abort(), [key]);
  const rows = result?.key === key ? result.rows : null;
  const visible = rows?.filter((row) => row.city !== "Black Market").slice(0, 3) ?? [];
  const loading = pending === key;
  async function load() {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      request.abort();
    }, 9000);
    setPending(key);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(
        `/api/market?${new URLSearchParams({ region, item: item.id, quality: "1" })}`,
        { signal: request.signal },
      );
      if (!response.ok) throw new Error("Source unavailable");
      const prices = parseMarketPreview(await response.json(), region, item.id);
      if (!request.signal.aborted) setResult({ key, rows: prices });
    } catch {
      if (controller.current === request && (!request.signal.aborted || timedOut)) setError(key);
    } finally {
      clearTimeout(timeout);
      if (controller.current === request) setPending(null);
    }
  }
  return (
    <div className="home-market-search">
      <CatalogItemPicker onSelect={setItem} />
      <div className="home-quick-lookups" aria-label="Quick item lookup">
        {[
          { id: "T4_BAG", name: "Bag" },
          { id: "T4_MAIN_AXE", name: "Battleaxe" },
          { id: "T4_CAPE", name: "Cape" },
        ].map((preset) => (
          <button
            type="button"
            key={preset.id}
            aria-pressed={item.id === preset.id}
            onClick={() => setItem({ id: preset.id, name: preset.name + " · T4.0" })}
          >
            <ItemIcon id={preset.id} size={24} />
            {preset.name}
          </button>
        ))}
      </div>
      <div className="home-market-selected">
        <ItemIcon id={item.id} size={40} />
        <div className="home-market-identity">
          <strong>{item.name}</strong>
          <span>Normal quality · {regions[region].label}</span>
        </div>
        <button type="button" className="button secondary" disabled={loading} onClick={load}>
          {loading ? "Loading prices…" : "Load city prices"}
        </button>
        <Link
          className="text-link home-market-open"
          href={`/tools/market?region=${region}&item=${encodeURIComponent(item.id)}`}
        >
          Open market →
        </Link>
      </div>
      <div role="status" aria-live="polite" className="home-market-status">
        {error === key
          ? "City prices are temporarily unavailable. Try loading again."
          : loading
            ? "Loading observed city prices…"
            : rows && !visible.length
              ? "No city observations are available for this item."
              : !rows
                ? "Load observed prices. Missing quotes stay unavailable."
                : null}
      </div>
      {!!visible.length && (
        <div
          className="home-market-table"
          role="region"
          aria-label="City price preview"
          tabIndex={0}
        >
          <table>
            <caption>{item.name} · observed silver per item</caption>
            <thead>
              <tr>
                <th scope="col">City</th>
                <th scope="col">Sell listing</th>
                <th scope="col">Buy order</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.city}>
                  <th scope="row">{row.city}</th>
                  <PreviewQuote value={row.sell_price_min} date={row.sell_price_min_date} />
                  <PreviewQuote value={row.buy_price_max} date={row.buy_price_max_date} />
                </tr>
              ))}
            </tbody>
          </table>
          <p className="home-market-source">
            Albion Online Data Project · source times in UTC.{" "}
            {rows && rows.length > visible.length
              ? "Open market for all locations."
              : "Observations are not guaranteed execution prices."}
          </p>
        </div>
      )}
    </div>
  );
}
