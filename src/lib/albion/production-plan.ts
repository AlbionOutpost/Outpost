import { z } from "zod";
import { production, productionSchema } from "./production";
import { recipeFor } from "./recipes";
import { regionSchema } from "./region-config";

export const productionPlanSchema = z
  .object({
    kind: z.literal("production-plan"),
    region: regionSchema,
    runs: z.array(productionSchema).min(1).max(30),
  })
  .superRefine((plan, ctx) => {
    if (plan.runs.some((run) => run.region !== plan.region))
      ctx.addIssue({ code: "custom", message: "A production plan must use one game server" });
  });
export type ProductionPlanInput = z.infer<typeof productionPlanSchema>;

/** Gross shopping quantities: returned materials are a value credit, never stock available upfront. */
export function productionPlan(input: ProductionPlanInput) {
  const plan = productionPlanSchema.parse(input);
  const runs = plan.runs.map((configuration) => ({
    configuration,
    recipe: recipeFor(configuration),
    result: production(configuration),
  }));
  const materials = new Map<
    string,
    {
      id: string;
      name: string;
      city: string;
      quality: number;
      quantity: number;
      gross: number | null;
      sources: Set<string>;
    }
  >();
  for (const { configuration: run, result } of runs) {
    for (const row of result.rows) {
      const quality = row.quality === "selected" ? run.quality : 1;
      const key = `${run.materialCity}/${row.id}/${quality}`;
      const material = materials.get(key) ?? {
        id: row.id,
        name: row.name,
        city: run.materialCity,
        quality,
        quantity: 0,
        gross: 0,
        sources: new Set<string>(),
      };
      material.quantity += row.quantity;
      material.gross =
        material.gross === null || row.gross === null ? null : material.gross + row.gross;
      const observation = run.prices[row.id];
      material.sources.add(
        row.unit === null
          ? "Missing price"
          : observation.manual
            ? "Manual input"
            : `Observed ${observation.observedAt || "at unknown time"}`,
      );
      materials.set(key, material);
    }
  }
  function total(
    key: "upfront" | "profit" | "cashProfit" | "returnCredit" | "fees" | "revenue" | "cost",
  ) {
    if (runs.some((run) => run.result[key] === null)) return null;
    const value = runs.reduce((sum, run) => sum + run.result[key]!, 0);
    if (!Number.isFinite(value) || Math.abs(value) > 1e12)
      throw new Error("Plan totals exceed one trillion silver");
    return value;
  }
  const profit = total("profit"),
    revenue = total("revenue");
  return {
    runs,
    materials: [...materials.values()],
    complete: runs.every((run) => run.result.complete),
    stale: runs.some((run) => run.result.stale),
    upfront: total("upfront"),
    profit,
    cashProfit: total("cashProfit"),
    returnCredit: total("returnCredit"),
    fees: total("fees"),
    revenue,
    cost: total("cost"),
    margin: revenue && profit !== null ? (profit / revenue) * 100 : null,
    focus: plan.runs.reduce((sum, run) => sum + (run.useFocus ? run.focusUsed : 0), 0),
  };
}
