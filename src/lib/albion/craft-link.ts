import { z } from "zod";
import { cities } from "./region-config";
import { productionCities, type MechanicsProfile } from "./production-profile";
import type { ProductionInput } from "./production";
import type { CraftRow } from "./craft-ranking";

/** The calculator a recipe belongs to: cooking and alchemy have their own pages. */
export function calculatorPath(category: string | undefined) {
  return category === "cooking"
    ? "/tools/cooking"
    : category === "alchemy"
      ? "/tools/alchemy"
      : "/tools/crafting";
}

/** Opens a ranked craft in its calculator with the same markets, quality, fees and returns. */
export function craftLinkHref(row: Pick<CraftRow, "recipe" | "run">) {
  const r = row.run;
  const query = new URLSearchParams({
    region: r.region,
    recipe: row.recipe.id,
    buy: r.materialCity,
    sell: r.outputCity,
    quality: String(r.quality),
    tax: String(r.tax),
    setup: String(r.setupFee),
    rate: String(r.returnRate),
    returns: Object.keys(r.returns)
      .filter((id) => r.returns[id])
      .join(","),
  });
  if (r.mechanicsProfile) {
    query.set("craft", r.mechanicsProfile.city);
    query.set("daily", String(r.mechanicsProfile.dailyBonus));
  }
  return `${calculatorPath(row.recipe.category)}?${query}`;
}

const percent = z.coerce.number().min(0).max(100);
const linkSchema = z.object({
  buy: z.enum(cities).refine((c) => c !== "Black Market"),
  sell: z.enum(cities),
  quality: z.coerce.number().int().min(1).max(5),
  tax: percent,
  setup: percent,
  rate: z.coerce.number().min(0).max(99.9),
  returns: z
    .string()
    .max(600)
    .transform((s) => (s ? s.split(",") : []))
    .pipe(z.array(z.string().regex(/^[A-Z0-9_@]{3,100}$/)).max(12)),
  craft: z.enum(productionCities).optional(),
  daily: z.coerce
    .number()
    .refine((n) => n === 0 || n === 10 || n === 20)
    .optional(),
});

/** Settings from a craft finder link, or nothing when any part is malformed (never half-applied). */
export function parseCraftLink(
  params: Record<string, string | string[] | undefined>,
): Partial<ProductionInput> | undefined {
  if (typeof params.buy !== "string") return undefined;
  const scalar = Object.fromEntries(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
  const v = linkSchema.safeParse(scalar);
  if (!v.success) return undefined;
  const d = v.data;
  return {
    materialCity: d.buy,
    outputCity: d.sell,
    quality: d.quality,
    tax: d.tax,
    setupFee: d.setup,
    returnRate: d.rate,
    returns: Object.fromEntries(d.returns.map((id) => [id, true])),
    ...(d.craft
      ? {
          mechanicsProfile: {
            version: "grind-20261027",
            city: d.craft,
            dailyBonus: (d.daily ?? 0) as MechanicsProfile["dailyBonus"],
            refiningLevels: [0, 0, 0, 0, 0],
          },
        }
      : {}),
  };
}
