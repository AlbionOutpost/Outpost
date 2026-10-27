"use client";
import { useState } from "react";
import { useAtlasRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
import type { transport } from "@/lib/albion/transport";
import type { transportObservations } from "@/lib/albion/transport-prices";
type Row = ReturnType<typeof transport> &
  ReturnType<typeof transportObservations> & { itemId: string };
export function OpportunityScanner() {
  const region = useAtlasRegion(),
    [ids, setIds] = useState("T4_BAG,T4_MAIN_AXE"),
    [from, setFrom] = useState("Lymhurst"),
    [to, setTo] = useState("Caerleon"),
    [quality, setQuality] = useState("1"),
    [mode, setMode] = useState("instant"),
    [tax, setTax] = useState("0"),
    [fee, setFee] = useState("0"),
    [result, setResult] = useState<{ key: string; rows: Row[]; methodology: string } | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const query = new URLSearchParams({
    region,
    items: ids.replace(/\s/g, ""),
    fromCity: from,
    toCity: to,
    quality,
    saleMode: mode,
    tax,
    fee,
  }).toString();
  const rows = result?.key === query ? result.rows : [];
  return (
    <section className="panel section">
      <h2>Observed cross-city opportunities</h2>
      <p>
        Compare up to25 explicit item IDs in a single batched request. Estimates are opportunities
        to investigate, not guaranteed profit.
      </p>
      <label>
        Scanner item IDs (comma-separated)
        <textarea value={ids} maxLength={2600} onChange={(e) => setIds(e.target.value)} />
      </label>
      <div className="input-grid">
        <label>
          Scanner purchase market
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Scanner destination market
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Scanner sale mode
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="instant">Observed buy orders</option>
            <option value="listing">Player sell listing estimate</option>
          </select>
        </label>
        <label>
          Scanner quality
          <select value={quality} onChange={(e) => setQuality(e.target.value)}>
            {[1, 2, 3, 4, 5].map((q) => (
              <option key={q}>{q}</option>
            ))}
          </select>
        </label>
        <label>
          Scanner tax (%)
          <input
            type="number"
            min={0}
            max={100}
            value={tax}
            onChange={(e) => setTax(e.target.value)}
          />
        </label>
        <label>
          Scanner listing fee (%)
          <input
            type="number"
            min={0}
            max={100}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </label>
      </div>
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          setResult(null);
          try {
            const r = await fetch(`/api/opportunities?${query}`),
              b = await r.json();
            if (!r.ok) throw new Error(b.error);
            setResult({ key: query, rows: b.rows, methodology: b.methodology });
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Scan unavailable");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Loading observations…" : "Scan observed opportunities"}
      </button>
      <p role="status">{message}</p>
      {rows.length > 0 && (
        <>
          <p className="muted">{result?.methodology}</p>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Observed opportunity results"
          >
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Buy</th>
                  <th>Sell</th>
                  <th>Net estimate</th>
                  <th>Data status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.itemId}>
                    <td>{r.itemId}</td>
                    <td>{r.buy.value ?? "Unavailable"}</td>
                    <td>{r.sell.value ?? "Unavailable"}</td>
                    <td>
                      {r.profit === null
                        ? "Unavailable"
                        : r.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      {!r.complete
                        ? "Missing orders"
                        : r.stale
                          ? "Stale observations"
                          : "Recent observations"}
                      <small className="muted">
                        Buy: {r.buy.observedAt || "Unavailable"} · Sell:{" "}
                        {r.sell.observedAt || "Unavailable"}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
