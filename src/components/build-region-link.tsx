"use client";
import type { ComponentProps } from "react";
import Link from "./link";
import { useAtlasRegion } from "./region-context";
import { withBuildRegion } from "@/lib/build-region";
export default function BuildRegionLink({ href, ...props }: ComponentProps<typeof Link>) {
  const region = useAtlasRegion();
  return <Link {...props} href={typeof href === "string" ? withBuildRegion(href, region) : href} />;
}
export function BuildRegionInput() {
  const region = useAtlasRegion();
  return <input type="hidden" name="region" value={region} />;
}
