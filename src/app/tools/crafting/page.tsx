import { ProductionCalculator } from "@/components/production-calculator";
export const metadata = { title: "Crafting calculator" };
export default function Page() {
  return (
    <div className="production-calculator-page crafting-reference-page">
      <h1 className="page-title display-title">Crafting calculator</h1>
      <p className="intro">
        Choose a recipe, price your materials, and see the cost and profit of your crafting run.
      </p>
      <ProductionCalculator kind="crafting" />
    </div>
  );
}
