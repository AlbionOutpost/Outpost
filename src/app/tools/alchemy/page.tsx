import { ProductionCalculator } from "@/components/production-calculator";
export const metadata = { title: "Alchemy calculator" };
export default function Page() {
  return (
    <div className="production-calculator-page">
      <h1 className="page-title display-title">A better plan for every potion.</h1>
      <p className="intro">
        Price herbs and ingredients, choose a batch, and work out the silver left after your costs.
      </p>

      <p className="library-provenance">
        Historical recipes from your 27 October 2026 Grind archive. Quantities and output batches
        are captured facts; current mechanics and unlocks still need in-game confirmation.
      </p>
      <ProductionCalculator kind="crafting" category="alchemy" />
    </div>
  );
}
