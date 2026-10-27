import { Market } from "@/components/market";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; quality?: string }>;
}) {
  const p = await searchParams;
  return (
    <div className="market-explorer-page">
      <h1 className="page-title display-title">Market explorer</h1>
      <p className="intro">
        Compare player-observed prices. Zero prices mean no available observation.
      </p>
      <Market key={`${p.item || "T4_BAG"}:${p.quality || "1"}`} />
    </div>
  );
}
