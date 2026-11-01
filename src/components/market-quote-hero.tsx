import { ItemIcon } from "./item-icon";
import { Silver } from "./silver";
import type { MarketPrice } from "@/lib/albion/market-client";
import { sourceAge } from "@/lib/albion/source-age";
import { observedAt } from "./market-city-table";

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
              <small>
                {newest ? (
                  <>
                    <span className="city-dot" data-city={newest.city} aria-hidden="true" />
                    {newest.city} · {observedAt(newest.date)} UTC
                  </>
                ) : (
                  "Unavailable"
                )}
              </small>
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mx-hero-status" role="status">
          {status}
        </p>
      )}
    </section>
  );
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
  const age = sourceAge(date, now);
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <b className="numeric">{row && value ? <Silver value={value} /> : "—"}</b>
        <small>
          {row && date ? (
            <>
              <span className="city-dot" data-city={row.city} aria-hidden="true" />
              {row.city} ·{" "}
              <time dateTime={date} title={`${observedAt(date)} UTC`}>
                {age.label}
              </time>
              {age.stale && <span className="mx-stale">Stale</span>}
            </>
          ) : (
            missing
          )}
        </small>
      </dd>
    </div>
  );
}
