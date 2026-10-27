import { TransportCalculator } from "@/components/transport-calculator";
export default function Page() {
  return (
    <>
      <h1 className="page-title display-title">Transport calculator</h1>
      <p className="intro">
        Compare city prices against your cargo weight, carrying capacity, fees and risk budget.
      </p>
      <TransportCalculator />
    </>
  );
}
