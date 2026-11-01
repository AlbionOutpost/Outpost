"use client";
import Image from "next/image";
import { useState } from "react";
import { itemIconUrl } from "@/lib/albion/item-renderer";
export function ItemIcon({
  id,
  quality = 1,
  size = 48,
}: {
  id: string;
  quality?: number;
  size?: number;
}) {
  const [failed, setFailed] = useState("");
  let source: string;
  try {
    source = itemIconUrl(id, quality, Math.min(217, Math.max(96, size * 2)));
  } catch {
    return null;
  }
  return (
    <Image
      data-albion-icon="true"
      data-enchantment={id.match(/@(\d)$/)?.[1] || "0"}
      data-quality={quality}
      unoptimized
      src={
        failed === source
          ? `/api/item-icon?${new URLSearchParams({ id, quality: String(quality) })}`
          : source
      }
      onError={() => {
        if (failed !== source) setFailed(source);
      }}
      alt=""
      width={size}
      height={size}
      loading="lazy"
    />
  );
}
