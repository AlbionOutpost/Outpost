"use client";
import Link from "@/components/link";
import { useOutpostRegion } from "./region-context";

export function ArchiveBuildCopyLink({ slug }: { slug: string }) {
  const region = useOutpostRegion();
  return (
    <Link
      className="button primary"
      rel="nofollow"
      href={`/builds/new?${new URLSearchParams({ from: slug, region })}`}
    >
      Make this build yours
    </Link>
  );
}

export function EquipmentMarketLink({
  itemId,
  quality,
  region,
}: {
  itemId: string;
  quality: number;
  region?: string;
}) {
  const selected = useOutpostRegion();
  return (
    <Link
      className="text-link"
      href={`/tools/market?${new URLSearchParams({ region: region || selected, item: itemId, quality: String(quality) })}`}
    >
      Compare prices →
    </Link>
  );
}
