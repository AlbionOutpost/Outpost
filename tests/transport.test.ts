import { it, expect } from "vitest";
import {
  initialTransport,
  transport,
  transportSchema,
  tripsNeeded,
} from "../src/lib/albion/transport";
import {
  transportObservations,
  mergeTransportObservations,
} from "../src/lib/albion/transport-prices";
it("calculates capacity-constrained trips, fees and independent transport profit", () => {
  const v = initialTransport("europe");
  v.saleMode = "listing";
  v.quantity = 10;
  v.weight = 15;
  v.capacity = 100;
  v.costPerTrip = 20;
  v.risk = 10;
  v.buy.value = 100;
  v.sell.value = 150;
  v.tax = 8;
  v.fee = 2.5;
  const r = transport(v);
  expect(r.trips).toBe(2);
  expect(r.transportCost).toBe(50);
  expect(r.cost).toBe(1050);
  expect(r.fees).toBe(157.5);
  expect(r.profit).toBe(292.5);
  expect(r.roi).toBeCloseTo((292.5 / 1050) * 100);
});
it("counts trips exactly at decimal capacity boundaries", () => {
  // 3 × 0.1 kg = 0.3 kg exactly fills a 0.3 kg capacity: one trip, not two.
  const v = initialTransport("europe");
  v.quantity = 3;
  v.weight = 0.1;
  v.capacity = 0.3;
  v.costPerTrip = 100;
  expect(transport(v)).toMatchObject({ trips: 1, transportCost: 100 });
  // One more 0.1 kg item (0.4 kg) needs a second trip.
  expect(transport({ ...v, quantity: 4 })).toMatchObject({ trips: 2, transportCost: 200 });
  // 7 × 0.7 kg = 4.9 kg in 0.7 kg trips is exactly 7; 1.1 kg × 3 = 3.3 kg in 1.1 kg is 3.
  expect(tripsNeeded(7, 0.7, 0.7)).toBe(7);
  expect(tripsNeeded(3, 1.1, 1.1)).toBe(3);
  expect(tripsNeeded(10, 0.3, 0.9)).toBe(4); // 3.0 kg / 0.9 kg = 3.33… → 4
  expect(tripsNeeded(1_000_000, 1e6, 1e-9)).toBe(1e21);
  expect(tripsNeeded(5, 0, 100)).toBe(1); // weightless cargo still needs one trip
});
it("rejects zero-valued source sentinels while preserving deliberate manual zero prices", () => {
  const v = initialTransport("europe");
  v.tax = 0; // A no-tax fixture: the hand-worked values below include no sales tax.
  v.buy = {
    ...v.buy,
    value: 0,
    manual: false,
    itemId: v.itemId,
    region: v.region,
    city: v.fromCity,
  };
  v.sell.value = 150;
  expect(transport(v).complete).toBe(false);
  v.buy.manual = true;
  expect(transport(v).complete).toBe(true);
  expect(transport(v).profit).toBe(150);
});
it("does not silently reuse prices for another item, region, city, quality or sale mode", () => {
  const v = initialTransport("asia");
  v.buy = {
    ...v.buy,
    manual: false,
    value: 100,
    itemId: v.itemId,
    region: "asia",
    city: v.fromCity,
  };
  v.sell = {
    ...v.sell,
    manual: false,
    value: 150,
    itemId: v.itemId,
    execution: "instant",
    region: "asia",
    city: v.toCity,
  };
  expect(transport(v).complete).toBe(true);
  v.saleMode = "listing";
  expect(transport(v).profit).toBeNull();
  v.sell.execution = "listing";
  v.itemId = "T4_MAIN_AXE";
  expect(transport(v).profit).toBeNull();
  v.itemId = "T4_BAG";
  v.region = "europe";
  expect(transport(v).profit).toBeNull();
});
it("rejects zero capacity and purchases from the Black Market", () => {
  const v = initialTransport("europe");
  v.capacity = 0;
  expect(transportSchema.safeParse(v).success).toBe(false);
  v.capacity = 100;
  v.fromCity = "Black Market";
  expect(transportSchema.safeParse(v).success).toBe(false);
});
it("maps source sell minimum and destination buy maximum without reversing them", () => {
  const v = initialTransport("europe");
  const rows = [
    {
      item_id: v.itemId,
      quality: 1,
      city: v.fromCity,
      sell_price_min: 100,
      sell_price_min_date: "2020-01-01",
      buy_price_max: 90,
      buy_price_max_date: "2020-01-01",
    },
    {
      item_id: v.itemId,
      quality: 1,
      city: v.toCity,
      sell_price_min: 150,
      sell_price_min_date: "2020-01-01",
      buy_price_max: 130,
      buy_price_max_date: "2020-01-01",
    },
  ];
  let p = transportObservations(v, rows);
  expect(p.buy.value).toBe(100);
  expect(p.sell.value).toBe(130);
  v.saleMode = "listing";
  p = transportObservations(v, rows);
  expect(p.sell.value).toBe(150);
  expect(transportObservations(v, []).sell.value).toBeNull();
});

it("does not charge a listing fee for an instant sale and accepts manual Black Market targets", () => {
  const v = initialTransport("europe");
  v.quantity = 10;
  v.buy.value = 100;
  v.sell.value = 150;
  v.tax = 8;
  v.fee = 2.5;
  v.risk = 50;
  expect(transport(v).fees).toBe(120);
  expect(transport(v).profit).toBe(330);
  v.toCity = "Black Market";
  v.saleMode = "listing";
  expect(transport(v).fees).toBe(157.5);
  expect(transport(v).profit).toBe(292.5);
  v.sell.manual = false;
  v.sell.execution = "listing";
  v.sell.region = v.region;
  v.sell.city = v.toCity;
  v.sell.itemId = v.itemId;
  expect(transport(v).complete).toBe(false);
});

it("keeps edits made during a transport refresh and rejects another route", () => {
  const v = initialTransport("europe"),
    observed = { buy: { ...v.buy, value: 100 }, sell: { ...v.sell, value: 150 } };
  const current = { ...v, buy: { ...v.buy, value: 0 } };
  expect(mergeTransportObservations(current, v, observed).buy.value).toBe(0);
  expect(mergeTransportObservations(current, v, observed).sell.value).toBe(150);
  const other = { ...v, region: "asia" as const };
  expect(mergeTransportObservations(other, v, observed)).toBe(other);
});
