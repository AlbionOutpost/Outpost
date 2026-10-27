import { ProductionCalculator } from "@/components/production-calculator";
export default function Page() {
  return (
    <div className="production-calculator-page">
      <h1 className="page-title display-title">Crafting calculator</h1>
      <p className="intro">
        Price a starter recipe with your own assumptions and available market observations. Full
        recipe coverage remains incomplete.
      </p>
      <ProductionCalculator kind="crafting" />
    </div>
  );
}
