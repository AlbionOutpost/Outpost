import { z } from "zod";
import { observation } from "./production";
import { cities, regionSchema } from "./region-config";
import { trade } from "./calculations";
import { isStale } from "./freshness";
export const transportBase = z.object({
  kind: z.literal("transporting"),
  region: regionSchema,
  itemId: z
    .string()
    .regex(/^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/)
    .max(100),
  quality: z.number().int().min(1).max(5),
  fromCity: z.enum(cities),
  toCity: z.enum(cities),
  saleMode: z.enum(["instant", "listing"]),
  quantity: z.number().int().min(1).max(1000000),
  weight: z.number().nonnegative().max(1e6),
  capacity: z.number().positive().max(1e9),
  costPerTrip: z.number().nonnegative().max(1e9),
  risk: z.number().nonnegative().max(1e12),
  tax: z.number().min(0).max(100),
  fee: z.number().min(0).max(100),
  buy: observation.extend({ itemId: z.string().nullable() }),
  sell: observation.extend({
    itemId: z.string().nullable(),
    execution: z.enum(["instant", "listing"]).nullable(),
  }),
});
export const transportSchema = transportBase.superRefine((v, c) => {
  if (v.fromCity === "Black Market")
    c.addIssue({
      code: "custom",
      message: "The Black Market buys from players; choose a player purchase market",
    });
});
export type TransportInput = z.infer<typeof transportSchema>;
export function initialTransport(region: TransportInput["region"]): TransportInput {
  const p = {
    itemId: null,
    value: null,
    manual: true,
    observedAt: null,
    region: null,
    city: null,
    quality: 1,
  };
  return {
    kind: "transporting",
    region,
    itemId: "T4_BAG",
    quality: 1,
    fromCity: "Lymhurst",
    toCity: "Caerleon",
    saleMode: "instant",
    quantity: 1,
    weight: 0,
    capacity: 100,
    costPerTrip: 0,
    risk: 0,
    tax: 0,
    fee: 0,
    buy: p,
    sell: { ...p, execution: null },
  };
}
/** One identity check is shared by accounting and the editable price display. */
export function transportPriceMatches(v: TransportInput, side: "buy" | "sell") {
  const p = v[side];
  return (
    p.value !== null &&
    p.quality === v.quality &&
    (p.manual ||
      (p.value > 0 &&
        p.region === v.region &&
        p.city === (side === "buy" ? v.fromCity : v.toCity) &&
        p.itemId === v.itemId)) &&
    (side !== "sell" || p.manual || v.sell.execution === v.saleMode) &&
    (side !== "sell" || v.toCity !== "Black Market" || v.saleMode === "instant" || p.manual)
  );
}
export function transport(input: TransportInput) {
  const v = transportSchema.parse(input),
    totalWeight = v.quantity * v.weight,
    trips = Math.max(1, Math.ceil(totalWeight / v.capacity)),
    transportCost = trips * v.costPerTrip + v.risk;
  if (transportCost > 1e12) throw new Error("Transport costs exceed one trillion silver");
  const complete = transportPriceMatches(v, "buy") && transportPriceMatches(v, "sell");
  const stale = [v.buy, v.sell].some((p) => !p.manual && (!p.observedAt || isStale(p.observedAt)));
  const result = complete
    ? trade({
        buy: v.buy.value!,
        sell: v.sell.value!,
        quantity: v.quantity,
        tax: v.tax,
        fee: v.saleMode === "listing" ? v.fee : 0,
        transport: transportCost,
      })
    : null;
  return {
    complete,
    stale,
    totalWeight,
    trips,
    transportCost,
    ...(result ?? { cost: null, revenue: null, fees: null, profit: null, roi: null, margin: null }),
  };
}
