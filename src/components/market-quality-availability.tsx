"use client";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { qualityAvailabilityResponse } from "@/lib/albion/market-availability";
import { isStale, sourceTimestamp } from "@/lib/albion/freshness";
import Link from "@/components/link";

const qualities = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];
type Availability = z.infer<typeof qualityAvailabilityResponse>;
export function MarketQualityAvailability({
  region,
  item,
  city,
  quality,
  onChoose,
}: {
  region: string;
  item: string;
  city: string;
  quality: string;
  onChoose: (quality: string) => void;
}) {
  const key = `${region}:${item.trim().toUpperCase()}:${city}`;
  const [state, setState] = useState<{ key: string; data?: Availability; error?: string } | null>(
    null,
  );
  const [pending, setPending] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), [key]);
  const current = state?.key === key ? state : null;
  const busy = pending === key;
  async function check() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setPending(key);
    try {
      const query = new URLSearchParams({ region, item: item.trim().toUpperCase() });
      if (city) query.set("city", city);
      const response = await fetch(`/api/market/qualities?${query}`, {
        signal: AbortSignal.any([active.signal, AbortSignal.timeout(15000)]),
      });
      if (!response.ok) throw new Error("Quality coverage could not load. Try again shortly.");
      const data = qualityAvailabilityResponse.parse(await response.json());
      if (
        data.region !== region ||
        data.item !== item.trim().toUpperCase() ||
        data.city !== (city || null)
      )
        throw new Error("Market selection changed. Check coverage again.");
      if (!active.signal.aborted) setState({ key, data });
    } catch (error) {
      if (!active.signal.aborted)
        setState({
          key,
          error: error instanceof Error ? error.message : "Quality coverage could not load.",
        });
    } finally {
      if (controller.current === active) setPending(null);
    }
  }
  function price(value: number | null, at: string | null, location: string | null) {
    if (value === null) return <span className="muted">Not observed</span>;
    const timestamp = sourceTimestamp(at || "");
    return (
      <>
        <strong className="numeric">{value.toLocaleString()}</strong>
        <small>
          {location} · {isStale(at || "") ? "Needs recheck" : "Recent"}
          {Number.isFinite(timestamp)
            ? ` · ${new Date(timestamp).toISOString().slice(0, 16).replace("T", " ")} UTC`
            : " · Date unknown"}
        </small>
      </>
    );
  }
  return (
    <section
      className="market-quality-availability"
      aria-label="Item quality coverage"
      aria-busy={busy}
    >
      <div className="section-heading">
        <div>
          <h3>Find a quality with observations</h3>
          <p>
            Prices belong to an exact item, city and quality. Check alternatives without changing
            your selection.
          </p>
        </div>
        <button type="button" className="button secondary" disabled={busy} onClick={check}>
          {busy ? "Checking quality coverage…" : "Check other qualities"}
        </button>
      </div>
      {current?.error && (
        <p role="status" className="error">
          {current.error}
        </p>
      )}
      {current?.data && (
        <>
          <div className="market-quality-cards">
            {current.data.qualities.map((row) => (
              <article key={row.quality}>
                <h4>{qualities[row.quality - 1]}</h4>
                {!row.sell && !row.buy ? (
                  <p className="muted">No orders observed for this quality.</p>
                ) : (
                  <dl>
                    <div>
                      <dt>Lowest sell listing</dt>
                      <dd>{price(row.sell, row.sellObservedAt, row.sellCity)}</dd>
                    </div>
                    <div>
                      <dt>Highest buy order</dt>
                      <dd>{price(row.buy, row.buyObservedAt, row.buyCity)}</dd>
                    </div>
                  </dl>
                )}
                <button
                  type="button"
                  className="button secondary"
                  disabled={quality === String(row.quality)}
                  onClick={() => onChoose(String(row.quality))}
                >
                  {quality === String(row.quality)
                    ? "Selected"
                    : `Use ${qualities[row.quality - 1]}`}
                </button>
              </article>
            ))}
          </div>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Quality availability comparison"
          >
            <table>
              <caption>
                {city || "All cities"} · {region} · Silver per item
              </caption>
              <thead>
                <tr>
                  <th scope="col">Quality</th>
                  <th scope="col">Lowest sell listing</th>
                  <th scope="col">Highest buy order</th>
                  <th scope="col">Selection</th>
                </tr>
              </thead>
              <tbody>
                {current.data.qualities.map((row) => (
                  <tr key={row.quality}>
                    <th scope="row">{qualities[row.quality - 1]}</th>
                    <td>{price(row.sell, row.sellObservedAt, row.sellCity)}</td>
                    <td>{price(row.buy, row.buyObservedAt, row.buyCity)}</td>
                    <td>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={quality === String(row.quality)}
                        onClick={() => onChoose(String(row.quality))}
                      >
                        {quality === String(row.quality)
                          ? "Selected"
                          : `Use ${qualities[row.quality - 1]}`}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p role="status">
            Selected: {qualities[Number(quality) - 1]}. Use Compare prices above to load this
            quality’s markets.
          </p>
        </>
      )}
      <p className="muted">
        No observation does not mean unavailable in game.{" "}
        <Link
          href={`/market-data?${new URLSearchParams({ region, item, quality, ...(city ? { city } : {}) })}`}
        >
          Help fill market coverage →
        </Link>
      </p>
    </section>
  );
}
