"use client";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { ItemIcon } from "@/components/item-icon";
import { useBatchQuotes } from "@/components/market-batch-quotes";
import { useAtlasRegion } from "@/components/region-context";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { summarizeLoadoutQuotes } from "@/lib/albion/loadout-quotes";
import { Silver } from "./silver";

export type PlanLine = { itemId: string; slot: string; qty: number };
const royal = ["Martlock", "Bridgewatch", "Lymhurst", "Fort Sterling", "Thetford", "Caerleon"];

/** A readable name when the pinned catalog doesn't know an item yet (newer patches). */
function readable(id: string) {
  const name = equipmentName(id);
  if (name !== id) return name.replace(/ · T\d\.\d$/, "");
  const [, tier, rest] = id.match(/^T(\d)_(.+?)(?:@\d)?$/) ?? [];
  return rest
    ? `T${tier} ${rest
        .split("_")
        .map((w) => w[0] + w.slice(1).toLowerCase())
        .join(" ")}`
    : id;
}

/**
 * A sample session plan priced from current quotes: tick off what you own with the stepper,
 * the progress, what's still to buy and the cheapest city to buy it update. The plan itself
 * is an example; the prices are observations.
 */
export function PlannerCard({ plan }: { plan: PlanLine[] }) {
  const region = useAtlasRegion();
  const [tab, setTab] = useState<"queue" | "buy">("queue");
  const [have, setHave] = useState<Record<string, number>>({});
  const { quotes, busy, refresh } = useBatchQuotes(region);
  const [settled, setSettled] = useState(false);
  const ref = useRef(refresh);
  useEffect(() => {
    ref.current = refresh;
  });
  const selected = plan.map((p) => ({ slot: p.slot, itemId: p.itemId, quality: 1 }));
  const key = selected.map((s) => s.itemId).join(",");
  useEffect(() => {
    void ref.current(selected).finally(() => setSettled(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-quote when the plan changes
  }, [region, key]);
  // Each royal city's quotes for the plan; a line is priced at its cheapest city.
  const perCity = royal.map((c) => ({
    city: c,
    rows: summarizeLoadoutQuotes(selected, quotes, c).rows,
  }));
  const cheapest = (i: number) =>
    perCity
      .map((c) => ({ city: c.city, price: c.rows[i]?.observation?.sell_price_min ?? null }))
      .filter((c): c is { city: string; price: number } => c.price != null && c.price > 0)
      .sort((a, b) => a.price - b.price)[0] ?? null;
  const loading = busy || !settled;
  const lines = plan.map((p, i) => ({
    ...p,
    i,
    best: cheapest(i),
    need: Math.max(0, p.qty - (have[p.itemId] ?? 0)),
  }));
  const owned = Object.values(have).reduce((a, v) => a + v, 0);
  const total = plan.reduce((a, p) => a + p.qty, 0);
  const toBuy = lines.reduce((a, l) => a + l.need, 0);
  const cost = lines.reduce((a, l) => a + (l.best?.price ?? 0) * l.need, 0);
  const unpriced = lines.filter((l) => l.need && !l.best).length;
  const byCity = perCity
    .map((c) => ({
      city: c.city,
      total: lines.reduce(
        (a, l) => a + (c.rows[l.i]?.observation?.sell_price_min ?? 0) * l.need,
        0,
      ),
      missing: lines.filter((l) => l.need && c.rows[l.i]?.observation?.sell_price_min == null)
        .length,
    }))
    .filter((c) => c.total > 0)
    .toSorted((a, b) => a.missing - b.missing || a.total - b.total)
    .slice(0, 3);
  const top = Math.max(...byCity.map((c) => c.total), 1);
  return (
    <div className="tool-card">
      <div className="tool-tabs" role="tablist" aria-label="Planner view">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "queue"}
          onClick={() => setTab("queue")}
        >
          Crafting queue ({plan.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "buy"}
          onClick={() => setTab("buy")}
        >
          Shopping list
        </button>
      </div>
      <ul className="tool-queue" aria-label="Planned items">
        {lines.map((l) => {
          const h = have[l.itemId] ?? 0;
          const pct = Math.round((h / l.qty) * 100);
          return (
            <li key={l.itemId}>
              <ItemIcon id={l.itemId} size={44} />
              <span className="tool-queue-name">
                <strong>{readable(l.itemId)}</strong>
                <small>
                  {l.slot} ·{" "}
                  {l.best ? (
                    <>
                      <Silver value={l.best.price} /> ea · {l.best.city}
                    </>
                  ) : loading ? (
                    "checking prices…"
                  ) : (
                    "no sell order"
                  )}
                </small>
              </span>
              {tab === "queue" ? (
                <span className="tool-queue-progress">
                  <i>
                    <b style={{ width: `${pct}%` }} />
                  </i>
                  <small>
                    {h} / {l.qty} · {pct}%
                  </small>
                </span>
              ) : (
                <span className="tool-queue-buy">
                  <small>Buy {l.need}</small>
                  <b>
                    <Silver value={l.best ? l.best.price * l.need : null} />
                  </b>
                </span>
              )}
              <span
                className="tool-stepper is-small"
                role="group"
                aria-label={`Owned ${readable(l.itemId)}`}
              >
                <button
                  type="button"
                  aria-label="Own one fewer"
                  disabled={!h}
                  onClick={() => setHave({ ...have, [l.itemId]: h - 1 })}
                >
                  <Minus size={12} />
                </button>
                <button
                  type="button"
                  aria-label="Own one more"
                  disabled={h >= l.qty}
                  onClick={() => setHave({ ...have, [l.itemId]: h + 1 })}
                >
                  <Plus size={12} />
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="tool-summary">
        <span>
          <small>Owned</small>
          <b>
            {owned} / {total}
          </b>
        </span>
        <span>
          <small>Still to buy</small>
          <b>
            {loading ? (
              <span className="tool-pending">…</span>
            ) : toBuy === 0 ? (
              "Done"
            ) : cost ? (
              <>
                <Silver value={cost} />
                {unpriced ? <span title={`${unpriced} item without a sell order`}>+</span> : null}
              </>
            ) : (
              <span className="tool-pending">No prices</span>
            )}
          </b>
        </span>
        <span>
          <small>Items left</small>
          <b>{toBuy}</b>
        </span>
      </div>
      <div className="tool-cities">
        <span className="tool-cities-head">Cheapest city to buy the rest</span>
        <ol>
          {byCity.map((c, i) => (
            <li key={c.city} className="is-buy">
              <span>
                <span className="city-dot" data-city={c.city} />
                {c.city}
                {i === 0 && !c.missing && <em>Cheapest</em>}
              </span>
              <i>
                <b style={{ width: `${(c.total / top) * 100}%` }} />
              </i>
              <span className="tool-cities-value">
                <Silver value={c.total} />
                {c.missing ? "+" : ""}
              </span>
            </li>
          ))}
          {!byCity.length && (
            <li className="tool-muted">
              {loading
                ? "Checking the royal cities…"
                : toBuy === 0
                  ? "Nothing left to buy."
                  : "No city sells these right now."}
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}
