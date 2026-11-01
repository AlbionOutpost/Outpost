import { z } from "zod";
import laborerData from "./game/laborers.json" with { type: "json" };
import { observation } from "./production";
import { cities, regionSchema } from "./region-config";
import { isStale } from "./freshness";
export const laborerTypes = [
  "WARRIOR",
  "HUNTER",
  "MAGE",
  "TOOLMAKER",
  "WOOD",
  "STONE",
  "ORE",
  "FIBER",
  "HIDE",
  "FISHING",
] as const;
export type LaborerType = (typeof laborerTypes)[number];
type TierData = { lootAmount: number; loot: Record<string, number> };
const data = laborerData as unknown as {
  names: Record<LaborerType, string>;
  tiers: Record<LaborerType, Record<string, TierData>>;
  returnFactor: Record<string, Record<string, number>>;
};
export const laborerNames = data.names;
export const laborerSource = "Laborer loot tables from game data, captured 27 Oct 2026";
export const journalId = (type: LaborerType, tier: number, full: boolean) =>
  `T${tier}_JOURNAL_${type}_${full ? "FULL" : "EMPTY"}`;
/** Happiness return factor for a journal in a house, or null when the game does not allow it. */
export function laborerReturnFactor(houseTier: number, journalTier: number) {
  return data.returnFactor[String(houseTier)]?.[String(journalTier - houseTier)] ?? null;
}
export function laborerLoot(type: LaborerType, journalTier: number) {
  const tier = data.tiers[type][String(journalTier)];
  if (!tier) return null;
  const total = Object.values(tier.loot).reduce((a, b) => a + b, 0);
  return {
    lootAmount: tier.lootAmount,
    items: Object.entries(tier.loot).map(([id, weight]) => ({ id, weight, share: weight / total })),
  };
}
export const laborerSchema = z
  .object({
    kind: z.literal("laborers"),
    region: regionSchema,
    type: z.enum(laborerTypes),
    journalTier: z.number().int().min(4).max(8),
    houseTier: z.number().int().min(2).max(8),
    journals: z.number().int().min(1).max(10000),
    journalCity: z.enum(cities),
    lootCity: z.enum(cities),
    saleMode: z.enum(["instant", "listing"]),
    sellEmpty: z.boolean(),
    buyOrder: z.boolean(),
    tax: z.number().min(0).max(100),
    setupFee: z.number().min(0).max(100),
    prices: z.record(z.string().max(100), observation),
  })
  .refine((v) => v.journalCity !== "Black Market" && v.lootCity !== "Black Market", {
    message: "The Black Market does not trade journals or resources",
  });
export type LaborerInput = z.infer<typeof laborerSchema>;
export function initialLaborers(region: LaborerInput["region"]): LaborerInput {
  return {
    kind: "laborers",
    region,
    type: "WARRIOR",
    journalTier: 4,
    houseTier: 4,
    journals: 1,
    journalCity: "Lymhurst",
    lootCity: "Lymhurst",
    saleMode: "instant",
    sellEmpty: false,
    buyOrder: false,
    tax: 8,
    setupFee: 2.5,
    prices: {},
  };
}
/**
 * Expected return of filled journals handed to laborers.
 * loot units = loot amount × happiness factor; value = Σ share × unit price over the loot table.
 * Unpriced loot counts as zero, so an incomplete result is a lower bound with its coverage shown.
 */
export function laborers(input: LaborerInput) {
  const v = laborerSchema.parse(input);
  const factor = laborerReturnFactor(v.houseTier, v.journalTier);
  const loot = laborerLoot(v.type, v.journalTier);
  if (factor === null || !loot)
    return {
      valid: false as const,
      reason: "This journal tier cannot be used in that house tier.",
    };
  let stale = false;
  const price = (id: string, city: string) => {
    const p = v.prices[id];
    if (!p || p.value === null || p.quality !== 1) return null;
    if (!p.manual && (p.value === 0 || p.region !== v.region || p.city !== city)) return null;
    if (!p.manual && (!p.observedAt || isStale(p.observedAt))) stale = true;
    return p.value;
  };
  const unitsPerJournal = loot.lootAmount * factor;
  let coverage = 0,
    valuePerUnit = 0;
  const rows = loot.items.map((item) => {
    const unit = price(item.id, v.lootCity);
    if (unit !== null) {
      coverage += item.share;
      valuePerUnit += item.share * unit;
    }
    const units = unitsPerJournal * item.share * v.journals;
    return { ...item, units, unit, value: unit === null ? null : unit * units };
  });
  const full = price(journalId(v.type, v.journalTier, true), v.journalCity);
  const empty = v.sellEmpty ? price(journalId(v.type, v.journalTier, false), v.lootCity) : 0;
  const saleRate = 1 - (v.tax + (v.saleMode === "listing" ? v.setupFee : 0)) / 100;
  const lootGross = valuePerUnit * unitsPerJournal * v.journals;
  const lootNet = lootGross * saleRate;
  const emptyNet = empty === null ? null : empty * v.journals * saleRate;
  const cost = full === null ? null : full * v.journals * (1 + (v.buyOrder ? v.setupFee : 0) / 100);
  const complete = coverage > 0.999999 && full !== null && emptyNet !== null;
  const profit = cost === null || emptyNet === null ? null : lootNet + emptyNet - cost;
  if (Math.abs(lootGross) > 1e12 || (cost ?? 0) > 1e12)
    throw new Error("Laborer totals exceed one trillion silver");
  return {
    valid: true as const,
    complete,
    stale,
    factor,
    unitsPerJournal,
    totalUnits: unitsPerJournal * v.journals,
    coverage,
    valuePerUnit,
    rows,
    lootGross,
    lootNet,
    emptyNet,
    cost,
    profit,
    margin: profit === null || !cost ? null : (profit / cost) * 100,
  };
}
