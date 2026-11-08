import { RotateCw } from "lucide-react";
import { ItemIcon } from "./item-icon";
import { StatusLine } from "./status-line";
import { Silver } from "./silver";
import type { MarketPrice } from "@/lib/albion/market-client";
import { sourceAge } from "@/lib/albion/source-age";
import { sourceTimestamp } from "@/lib/albion/freshness";
import { Skeleton, observedAt, priceAge } from "./market-city-table";

export const qualityNames = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];

/** "T6_MAIN_SWORD@2" → "T6.2"; ids without a tier prefix have none. */
export function tierLabel(id: string) {
  const match = /^T(\d)_[^@]*(?:@(\d))?$/.exec(id.trim().toUpperCase());
  return match ? `T${match[1]}.${match[2] ?? "0"}` : null;
}

/**
 * The page's primary element: the item being researched and its three headline figures. Each
 * figure keeps its own city and observation time; nothing shows until observations arrive.
 */
export function MarketQuoteHero({
  item,
  name,
  quality,
  region,
  scope,
  summary,
  newest,
  status,
  failed = false,
  onRetry,
  loading = false,
  now,
}: {
  item: string;
  name: string;
  quality: string;
  region: string;
  scope: string;
  summary: { ask: MarketPrice | null; bid: MarketPrice | null } | null;
  /** Most recent observation among the visible rows, either side. */
  newest: { city: string; date: string } | null;
  /** Shown instead of the figures while loading, after a failure or without data. */
  status: string;
  /** The request failed: the status is the page's one error, with a retry beside it. */
  failed?: boolean;
  onRetry?: () => void;
  /** Observations are on their way: the figures keep their places as stand-ins. */
  loading?: boolean;
  now: number;
}) {
  const tier = tierLabel(item);
  // Catalog names end in " · T4.0"; the tier chip already says it.
  const title = tier ? name.replace(/ · T\d\.\d$/, "") : name;
  const regionLabel = region.charAt(0).toUpperCase() + region.slice(1);
  const qualityName = qualityNames[Number(quality) - 1] || "Unknown quality";
  return (
    <section className="raised mx-hero" aria-label="Selected item">
      <div className="market-selection mx-identity" aria-label="Selected market item">
        <span className="mx-item-well">
          <ItemIcon id={item} quality={Number(quality)} size={80} />
        </span>
        <div>
          <h2>{title}</h2>
          <p className="mx-chips">
            {tier && <span className="mx-chip is-tier">{tier}</span>}
            <span className="mx-chip">{qualityName}</span>
            <span className="mx-chip">{regionLabel}</span>
            <span className="mx-chip">{scope}</span>
          </p>
        </div>
      </div>
      {summary ? (
        <dl className="market-quote-summary mx-figures">
          <Figure
            label="Lowest sell order"
            row={summary.ask}
            value={summary.ask?.sell_price_min}
            date={summary.ask?.sell_price_min_date}
            missing="No sell order seen"
            now={now}
          />
          <Figure
            label="Highest buy order"
            row={summary.bid}
            value={summary.bid?.buy_price_max}
            date={summary.bid?.buy_price_max_date}
            missing="No buy order seen"
            now={now}
          />
          <div>
            <dt>Newest observation</dt>
            <dd>
              <b>{newest ? sourceAge(newest.date, now).label : "—"}</b>
              <small className="mx-newest">
                {newest ? (
                  <>
                    <span className="city-dot" data-city={newest.city} aria-hidden="true" />
                    <span>
                      {newest.city} · {/* Today's time alone; an older one keeps its date */}
                      <time dateTime={newest.date} title={`${observedAt(newest.date)} UTC`}>
                        {newestStamp(newest.date, now)}
                      </time>
                    </span>
                  </>
                ) : (
                  "Unavailable"
                )}
              </small>
            </dd>
          </div>
        </dl>
      ) : loading ? (
        <>
          <dl className="mx-figures is-loading">
            {["Lowest sell order", "Highest buy order", "Newest observation"].map((label, i) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <b className={i < 2 ? "numeric is-price" : "numeric"}>
                    <Skeleton>00,000</Skeleton>
                  </b>
                  <small>
                    <Skeleton>Fort Sterling · 6 h</Skeleton>
                  </small>
                </dd>
              </div>
            ))}
          </dl>
          <p className="sr-only" role="status">
            {status}
          </p>
        </>
      ) : (
        <div className="mx-hero-status">
          <StatusLine tone={failed ? "error" : "default"}>{status}</StatusLine>
          {failed && onRetry && (
            <button type="button" className="pill-link is-small" onClick={onRetry}>
              <RotateCw size={14} aria-hidden="true" />
              Try again
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** Today's observation shows its UTC time, an older one its UTC day; the exact time is on hover. */
function newestStamp(date: string, now: number) {
  const stamp = observedAt(date);
  if (stamp === "Unknown") return "time unknown";
  if (now && stamp.startsWith(new Date(now).toISOString().slice(0, 10)))
    return `${stamp.slice(11)} UTC`;
  return new Date(sourceTimestamp(date)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function Figure({
  label,
  row,
  value,
  date,
  missing,
  now,
}: {
  label: string;
  row: MarketPrice | null;
  value?: number;
  date?: string;
  missing: string;
  now: number;
}) {
  const age = row && date ? priceAge(date, now) : null;
  // Within the hour the city stands alone; older figures add a short age, past a day dimmed.
  return (
    <div className={age ? `is-${age.tone}` : undefined}>
      <dt>{label}</dt>
      <dd title={age ? `Seen ${age.exact}` : undefined}>
        <b className="numeric">{row && value ? <Silver value={value} /> : "—"}</b>
        <small>
          {row && age ? (
            <>
              <span className="city-dot" data-city={row.city} aria-hidden="true" />
              {row.city}
              <time dateTime={date}>
                {age.tone !== "fresh" && (
                  <span className="mx-age" aria-hidden="true">
                    · {age.short}
                  </span>
                )}
                <span className="sr-only">, {age.spoken}</span>
              </time>
            </>
          ) : (
            missing
          )}
        </small>
      </dd>
    </div>
  );
}
