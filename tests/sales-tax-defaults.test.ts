import { expect, it } from "vitest";
import { initialProduction, production } from "@/lib/albion/production";
import { initialTransport } from "@/lib/albion/transport";
import { initialLaborers } from "@/lib/albion/laborers";
import { initialFarming } from "@/lib/albion/farming";
import { DEFAULT_SALES_TAX, salesTaxPresets } from "@/lib/albion/sales-tax";

// Owner decision (8 Nov 2026): every sales-tax field starts at the Premium rate, 4%.
it("starts every calculator's sales tax at Premium 4%", () => {
  expect(DEFAULT_SALES_TAX).toBe(4);
  for (const kind of ["crafting", "refining", "enchanting"] as const)
    expect(initialProduction(kind, "europe").tax).toBe(4);
  expect(initialTransport("europe").tax).toBe(4);
  expect(initialLaborers("europe").tax).toBe(4);
  expect(initialFarming("europe").sellFee).toBe(4);
});

it("offers Premium 4% and No premium 8% as the quick choices", () => {
  expect(salesTaxPresets.map((p) => [p.label, p.value])).toEqual([
    ["Premium 4%", 4],
    ["No premium 8%", 8],
  ]);
});

it("leaves setup fee defaults unchanged", () => {
  expect(initialProduction("crafting", "europe").setupFee).toBe(0);
  expect(initialTransport("europe").fee).toBe(0);
  expect(initialLaborers("europe").setupFee).toBe(2.5);
});

it("charges the default tax on a default run and keeps an explicit saved rate", () => {
  const manual = (value: number) => ({
    value,
    manual: true,
    observedAt: null,
    region: null,
    city: null,
    quality: 1,
  });
  const run = initialProduction("crafting", "europe");
  run.prices = { T4_PLANKS: manual(100), T4_METALBAR: manual(100), T4_MAIN_AXE: manual(3000) };
  // Revenue 3,000 × 4% = 120 silver of tax, no setup fee by default.
  expect(production(run).fees).toBe(120);
  // A saved scenario carrying 0% tax keeps it.
  expect(production({ ...run, tax: 0 }).fees).toBe(0);
});
