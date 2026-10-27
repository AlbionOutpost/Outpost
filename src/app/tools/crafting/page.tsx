import { ProductionCalculator } from "@/components/production-calculator";
export default function Page() {
  return (
    <div className="production-calculator-page">
      <h1 className="page-title display-title">Crafting calculator</h1>
      <p className="intro">
        Choose a recipe, price your materials and see what your next crafting run could earn.
      </p>
      <ProductionCalculator kind="crafting" />
    </div>
  );
}
