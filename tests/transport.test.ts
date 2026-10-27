import { it, expect } from "vitest";
import { initialTransport, transport, transportSchema } from "../src/lib/albion/transport";
import { transportObservations } from "../src/lib/albion/transport-prices";
it("calculates capacity-constrained trips, fees and independent transport profit", () => {
  const v = initialTransport("europe");
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
it("rejects zero-valued source sentinels while preserving deliberate manual zero prices", () => {
  const v = initialTransport("europe");
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
it("rejects zero capacity and unsupported Black Market listings", () => {
  const v = initialTransport("europe");
  v.capacity = 0;
  expect(transportSchema.safeParse(v).success).toBe(false);
  v.capacity = 100;
  v.toCity = "Black Market";
  v.saleMode = "listing";
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
