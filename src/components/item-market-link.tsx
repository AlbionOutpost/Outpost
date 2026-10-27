"use client";
import Link from "next/link";
import { useAtlasRegion } from "./region-context";
export function ItemMarketLink({ id }: { id: string }) {
  const region = useAtlasRegion();
  return (
    <Link
      className="button primary"
      href={`/tools/market?${new URLSearchParams({ item: id, region })}`}
    >
      Compare market observations
    </Link>
  );
}
