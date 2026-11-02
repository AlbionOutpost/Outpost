"use client";
import Link from "@/components/link";
import { useOutpostRegion } from "./region-context";
export function ItemMarketLink({ id }: { id: string }) {
  const region = useOutpostRegion();
  return (
    <Link
      className="button primary"
      href={`/tools/market?${new URLSearchParams({ item: id, region })}`}
    >
      Compare market observations
    </Link>
  );
}
