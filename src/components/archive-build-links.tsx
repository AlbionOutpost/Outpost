"use client";
import Link from "next/link";
import { useAtlasRegion } from "./region-context";

export function ArchiveBuildCopyLink({ slug }: { slug: string }) {
  const region = useAtlasRegion();
  return (
    <Link
      className="button primary"
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
  const selected = useAtlasRegion();
  return (
    <Link
      className="text-link"
      href={`/tools/market?${new URLSearchParams({ region: region || selected, item: itemId, quality: String(quality) })}`}
    >
      Compare prices →
    </Link>
  );
}
