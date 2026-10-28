"use client";
import { useState } from "react";
import { useAtlasRegion } from "./region-context";
import { cities, type Region } from "@/lib/albion/region-config";
import { useBatchQuotes, BatchQuote, quoteKey } from "./market-batch-quotes";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { ItemIcon } from "./item-icon";
import { AddToShopping } from "./add-to-shopping";
import { summarizeLoadoutQuotes } from "@/lib/albion/loadout-quotes";
import Link from "@/components/link";
export function LoadoutPriceCheck({
  equipment,
  region: sourceRegion,
}: {
  equipment: { slot: string; itemId: string; quality: number }[];
  region?: Region;
}) {
  const selectedRegion = useAtlasRegion();
  const region = sourceRegion ?? selectedRegion;
  const [city, setCity] = useState("Fort Sterling");
  const { quotes, busy, refresh } = useBatchQuotes(region);
  const selected = equipment.filter((e) => e.itemId);
  const estimate = summarizeLoadoutQuotes(selected, quotes, city);
  return (
    <section className="loadout-price-check">
      <div className="library-section-heading">
        <div>
          <h2>What will this loadout cost?</h2>
          <p>Check one of each equipped item on {region}, at its selected quality.</p>
        </div>
        <div className="loadout-quote-actions">
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

          <label>
            Purchase city
            <select
              aria-label="Loadout purchase city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {cities
                .filter((c) => c !== "Black Market")
                .map((c) => (
                  <option key={c}>{c}</option>
                ))}
            </select>
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={busy || !selected.length}
            onClick={() => refresh(selected)}
          >
            {busy ? "Checking prices…" : "Check loadout prices"}
          </button>
        </div>
      </div>
      <div className="loadout-price-total" aria-live="polite">
        <strong>
          {estimate.knownCost === null
            ? "Estimate exceeds supported silver range"
            : estimate.total !== null
              ? `${estimate.total.toLocaleString()} silver`
              : estimate.priced
                ? `${estimate.knownCost.toLocaleString()} silver known`
                : estimate.checked
                  ? "No purchase prices observed"
                  : "Prices not checked"}
        </strong>
        <span>
          {estimate.checked
            ? `${estimate.priced}/${selected.length} items priced in ${city} · ${estimate.recent} recent${estimate.stale ? ` · ${estimate.stale} need a freshness check` : ""}${estimate.knownCost === null ? " · Total outside supported range" : estimate.missing ? " · Estimate incomplete" : estimate.stale ? " · Historical / unverified cost estimate" : " · Estimated listing cost"}${estimate.failed ? " · Refresh incomplete; last scans retained" : ""}`
            : "Choose a purchase city, then check community scans. A price check is not a purchase guarantee."}
        </span>
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
        Albion Online Data Project · crowdsourced observations, not a full order book or guaranteed
        purchase price. Older scans remain visible with their dates; missing scans are excluded from
        the known subtotal.{" "}
        <Link href={`/market-data?${new URLSearchParams({ region, city })}`}>
          How market scans work →
        </Link>
      </p>
    </section>
  );
}
