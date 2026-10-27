import type { MarketPrice } from "./market-client";
import type { TransportInput } from "./transport";
export function transportObservations(
  v: Pick<TransportInput, "region" | "itemId" | "quality" | "fromCity" | "toCity" | "saleMode">,
  rows: MarketPrice[],
) {
  const from = rows.find(
      (r) => r.item_id === v.itemId && r.quality === v.quality && r.city === v.fromCity,
    ),
    to = rows.find((r) => r.item_id === v.itemId && r.quality === v.quality && r.city === v.toCity);
  return {
    buy: {
      itemId: v.itemId,
      value: from?.sell_price_min || null,
      observedAt: from?.sell_price_min ? from.sell_price_min_date : null,
      manual: false,
      region: v.region,
      city: v.fromCity,
      quality: v.quality,
    },
    sell: {
      itemId: v.itemId,
      execution: v.saleMode,
      value: (v.saleMode === "instant" ? to?.buy_price_max : to?.sell_price_min) || null,
      observedAt:
        v.saleMode === "instant"
          ? to?.buy_price_max
            ? to.buy_price_max_date
            : null
          : to?.sell_price_min
            ? to.sell_price_min_date
            : null,
      manual: false,
      region: v.region,
      city: v.toCity,
      quality: v.quality,
    },
  };
}
