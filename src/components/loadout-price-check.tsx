"use client";
import { useEffect, useRef, useState } from "react";
import { useOutpostRegion } from "./region-context";
import { cities, regions, type Region } from "@/lib/albion/region-config";
import { useBatchQuotes, BatchQuote, quoteKey } from "./market-batch-quotes";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { ItemIcon } from "./item-icon";
import { AddToShopping } from "./add-to-shopping";
import { summarizeLoadoutQuotes } from "@/lib/albion/loadout-quotes";
import Link from "@/components/link";
import { PanelHead } from "./panel-head";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
export function LoadoutPriceCheck({
  equipment,
  region: sourceRegion,
  autoLoad = false,
}: {
  equipment: { slot: string; itemId: string; quality: number }[];
  region?: Region;
  /** Check prices once the section scrolls into view instead of waiting for the button. */
  autoLoad?: boolean;
}) {
  const selectedRegion = useOutpostRegion();
  const region = sourceRegion ?? selectedRegion;
  const [city, setCity] = useState("Fort Sterling");
  const { quotes, busy, refresh } = useBatchQuotes(region);
  const selected = equipment.filter((e) => e.itemId);
  const estimate = summarizeLoadoutQuotes(selected, quotes, city);
  const root = useRef<HTMLElement | null>(null);
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });
  const selectionKey = selected.map(quoteKey).join("|");
  useEffect(() => {
    if (!autoLoad || !root.current || !selectionKey) return;
    const target = root.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void refreshRef.current(selected);
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
    // `selected` is derived from selectionKey; the key is the stable dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, region, selectionKey]);
  return (
    <section className="loadout-price-check" ref={root}>
      <PanelHead
        title="What will this loadout cost?"
        line={`One of each equipped item at its quality, bought in the city you pick on the ${regions[region].label} server.`}
        actions={
          <div className="loadout-quote-actions">
            <label>
              <span className="sr-only">Purchase city</span>
              <WellSelect
                aria-label="Loadout purchase city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                {cities
                  .filter((c) => c !== "Black Market")
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
              </WellSelect>
            </label>
            <AddToShopping
              region={region}
              label="Shop this loadout"
              entries={selected.map((item) => ({
                itemId: item.itemId,
                name: equipmentName(item.itemId),
                city: city as (typeof cities)[number],
                quality: item.quality,
                quantity: 1,
                owned: 0,
                unitPrice: null,
                priceKind: "manual" as const,
                observedAt: null,
              }))}
            />
            <button
              type="button"
              className="button secondary"
              disabled={busy || !selected.length}
              onClick={() => refresh(selected)}
            >
              {busy ? "Checking prices…" : "Check loadout prices"}
            </button>
          </div>
        }
      />
      <div className="loadout-price-total" aria-live="polite">
        <div className="build-cost-figure">
          <small>Loadout total in {city}</small>
          <strong className="build-cost-total">
            {estimate.knownCost === null ? (
              <Unavailable label="Estimate exceeds supported silver range" />
            ) : estimate.total !== null ? (
              `${estimate.total.toLocaleString()} silver`
            ) : estimate.priced ? (
              `${estimate.knownCost.toLocaleString()} silver known`
            ) : (
              <Unavailable
                label={estimate.checked ? "No purchase prices observed" : "Not checked yet"}
              />
            )}
          </strong>
        </div>
        <div className="build-cost-figure">
          <small>Items priced</small>
          <strong>
            {estimate.checked ? (
              `${estimate.priced}/${selected.length}`
            ) : (
              <Unavailable label="Not checked yet" />
            )}
          </strong>
        </div>
        <StatusLine tone={estimate.stale ? "stale" : "default"}>
          {estimate.checked
            ? [
                `${estimate.recent} recent`,
                estimate.stale ? `${estimate.stale} need a freshness check` : "",
                estimate.knownCost === null
                  ? "Total outside supported range"
                  : estimate.missing
                    ? "Estimate incomplete"
                    : estimate.stale
                      ? "Older scans, prices may have moved"
                      : "Lowest sell orders",
                estimate.failed ? "Some prices did not load; showing the last check" : "",
              ]
                .filter(Boolean)
                .join(" · ")
            : busy
              ? `Checking prices in ${city}…`
              : "Pick a city and check prices. Prices are player scans and can be out of date."}
        </StatusLine>
      </div>
      <details>
        <summary>Individual item observations</summary>
        <div className="loadout-quote-list">
          {selected.map((e) => (
            <div key={e.slot}>
              <span>
                <ItemIcon id={e.itemId} quality={e.quality} size={40} />
                <span>
                  {equipmentName(e.itemId)}
                  <small>
                    {e.slot} · Quality {e.quality}
                  </small>
                </span>
              </span>
              <div>
                <BatchQuote quote={quotes[quoteKey(e)]} city={city} purchaseOnly />
                <Link
                  className="text-link"
                  href={`/tools/market?${new URLSearchParams({ region, item: e.itemId, quality: String(e.quality) })}`}
                >
                  Compare cities & qualities →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </details>
      <p className="library-provenance">
        Prices from the Albion Online Data Project, scanned by players. Items without a price are
        left out of the total.{" "}
        <Link href={`/market-data?${new URLSearchParams({ region, city })}`}>
          How market scans work →
        </Link>
      </p>
    </section>
  );
}
