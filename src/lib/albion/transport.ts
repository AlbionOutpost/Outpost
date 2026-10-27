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
  if (v.toCity === "Black Market" && v.saleMode !== "instant")
    c.addIssue({
      code: "custom",
      message: "Black Market scenarios use observed buy orders, not player sell listings",
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
export function transport(input: TransportInput) {
  const v = transportSchema.parse(input),
    totalWeight = v.quantity * v.weight,
    trips = Math.max(1, Math.ceil(totalWeight / v.capacity)),
    transportCost = trips * v.costPerTrip + v.risk;
  if (transportCost > 1e12) throw new Error("Transport costs exceed one trillion silver");
  const valid = (p: TransportInput["buy"], city: string) =>
    p.value !== null &&
    (p.manual || p.value > 0) &&
    p.quality === v.quality &&
    (p.manual || (p.region === v.region && p.city === city && p.itemId === v.itemId));
  const complete =
    valid(v.buy, v.fromCity) &&
    valid(v.sell, v.toCity) &&
    (v.sell.manual || v.sell.execution === v.saleMode);
  const stale = [v.buy, v.sell].some((p) => !p.manual && (!p.observedAt || isStale(p.observedAt)));
  const result = complete
    ? trade({
        buy: v.buy.value!,
        sell: v.sell.value!,
        quantity: v.quantity,
        tax: v.tax,
        fee: v.fee,
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
