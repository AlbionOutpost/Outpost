import { ProductionCalculator } from "@/components/production-calculator";
export default function Page() {
  return (
    <div className="production-calculator-page">
      <h1 className="page-title display-title">Enchanting calculator</h1>
      <p className="intro">
        Compare equipment and rune, soul or relic costs with your expected upgraded-item sale price.
      </p>
      <ProductionCalculator kind="enchanting" />
    </div>
  );
}
