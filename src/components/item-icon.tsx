"use client";
import Image from "next/image";
import { useState } from "react";
import { itemIconUrl } from "@/lib/albion/item-renderer";

/**
 * The official render server 404s some high-enchantment ids (notably @4 gear), so when the
 * enchanted art fails we try the base-tier art, then our own proxy (which also strips the
 * enchantment and finally returns a neutral placeholder). The enchanted glow shows whenever
 * the server has it; otherwise the base artwork still identifies the item.
 */
type ItemIconProps = { id: string; quality?: number; size?: number };

export function ItemIcon(props: ItemIconProps) {
  // A new item, quality or render size must retry its own primary artwork. Remounting also
  // prevents a late error from the previous image from advancing the new fallback chain.
  return <ItemArtwork key={`${props.id}:${props.quality ?? 1}:${props.size ?? 48}`} {...props} />;
}

function ItemArtwork({ id, quality = 1, size = 48 }: ItemIconProps) {
  const [step, setStep] = useState(0);
  const render = Math.min(217, Math.max(96, size * 2));
  const base = id.replace(/@\d$/, "");
  const chain: string[] = [];
  try {
    chain.push(itemIconUrl(id, quality, render));
    if (base !== id) chain.push(itemIconUrl(base, quality, render));
  } catch {
    // Primary id is unparseable; fall straight to the proxy, which validates and placeholders.
  }
  chain.push(`/api/item-icon?${new URLSearchParams({ id, quality: String(quality) })}`);
  const src = chain[Math.min(step, chain.length - 1)];
  return (
    <Image
      data-albion-icon="true"
      data-enchantment={id.match(/@(\d)$/)?.[1] || "0"}
      data-quality={quality}
      unoptimized
      src={src}
      onError={() => setStep((s) => (s < chain.length - 1 ? s + 1 : s))}
      alt=""
      width={size}
      height={size}
      loading="lazy"
    />
  );
}
