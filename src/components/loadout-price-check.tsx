"use client";
import { useState } from "react";
import { useAtlasRegion } from "./region-context";
import { cities, type Region } from "@/lib/albion/region-config";
import { useBatchQuotes, BatchQuote, quoteKey } from "./market-batch-quotes";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { ItemIcon } from "./item-icon";
import { AddToShopping } from "./add-to-shopping";
import { isStale } from "@/lib/albion/freshness";
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
  const observations = selected.map((item) =>
    quotes[quoteKey(item)]?.prices.find(
      (p) => p.city === city && p.sell_price_min > 0 && !isStale(p.sell_price_min_date),
    ),
  );
  const complete = !!selected.length && observations.every(Boolean);
  return (
    <section className="loadout-price-check">
      <div className="library-section-heading">
        <div>
          <h2>What will this loadout cost?</h2>
          <p>Check community market observations on {region}. Each item keeps its source date.</p>
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
      <div className="loadout-price-total">
        <strong>
          {complete
            ? observations.reduce((sum, row) => sum + row!.sell_price_min, 0).toLocaleString() +
              " silver"
            : "Total unavailable"}
        </strong>
        <span>
          {complete
            ? `Observed sell listings in ${city}`
            : "Every slot needs a recent sell listing in the selected city."}
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
              <BatchQuote quote={quotes[quoteKey(e)]} />
            </div>
          ))}
        </div>
      </details>
      <p className="library-provenance">
        Albion Online Data Project · crowdsourced observations, not a full order book or guaranteed
        purchase price. Missing or stale observations never count as zero.
      </p>
    </section>
  );
}
