import { ProductionCalculator } from "@/components/production-calculator";
export const metadata = { title: "Cooking calculator" };
export default function Page() {
  return (
    <div className="production-calculator-page">
      <h1 className="page-title display-title">Make every ingredient count.</h1>
      <p className="intro">
        Plan meals, ingredient purchases and batch profit. Compare market observations or use your
        own prices.
      </p>

      <p className="library-provenance">
        Recipes restored from the 27 October 2026 Grind archive. Exact captured batch quantities are
        retained. Return eligibility, station fees, focus and current-patch compatibility require
        your in-game setup.
      </p>
      <ProductionCalculator kind="crafting" category="cooking" />
    </div>
  );
}
