import { FarmingCalculator } from "@/components/farming-calculator";
export const metadata = { title: "Farming calculator" };
export default function Page() {
  return (
    <div className="farming-page">
      <h1 className="page-title display-title">Farming calculator</h1>
      <p className="intro">
        Plan crops and herbs, compare watering, and see what your harvest could earn.
      </p>
      <FarmingCalculator />
    </div>
  );
}
