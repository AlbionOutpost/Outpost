"use client";
import Image from "next/image";
import type { ComponentProps } from "react";
import Link from "@/components/link";
import { useOutpostRegion } from "./region-context";

/**
 * The Outpost lockup: the painted banner mark with "OUTPOST" set beside it in the display face,
 * linking home on the player's server. `md` is the header, `sm` the footer and drawer. The word
 * gives way to the mark alone only on the narrowest phones (see `.brand-lockup` in product-shell.css).
 */
export function BrandLockup({
  size = "md",
  className,
  ...link
}: { size?: "sm" | "md" } & Omit<ComponentProps<typeof Link>, "href" | "children">) {
  const region = useOutpostRegion();
  const mark = size === "md" ? 44 : 36;
  return (
    <Link
      {...link}
      href={`/?region=${region}`}
      aria-label="Outpost home"
      className={`brand-lockup${className ? ` ${className}` : ""}`}
      data-size={size}
    >
      <Image
        src="/brand/outpost-mark.png"
        alt=""
        width={mark}
        height={mark}
        priority={size === "md"}
      />
      <span className="brand-lockup-word" aria-hidden="true">
        OUTPOST
      </span>
    </Link>
  );
}
