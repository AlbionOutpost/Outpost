"use client";
import type { ComponentProps } from "react";
import Link from "./link";
import { useOutpostRegion } from "./region-context";
import { withBuildRegion } from "@/lib/build-region";
export default function BuildRegionLink({ href, ...props }: ComponentProps<typeof Link>) {
  const region = useOutpostRegion();
  return <Link {...props} href={typeof href === "string" ? withBuildRegion(href, region) : href} />;
}
export function BuildRegionInput() {
  const region = useOutpostRegion();
  return <input type="hidden" name="region" value={region} />;
}
