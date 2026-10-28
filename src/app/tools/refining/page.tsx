import { ProductionCalculator } from "@/components/production-calculator";
export default function Page() {
  return (
    <div className="production-calculator-page">
      <h1 className="page-title display-title">Refining calculator</h1>
      <p className="intro">
        Choose a resource, configure your station, and compare material costs with the value of your
        refined output.
      </p>
      <ProductionCalculator kind="refining" />
    </div>
  );
}
