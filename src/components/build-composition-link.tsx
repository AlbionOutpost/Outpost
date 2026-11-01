"use client";
import Link from "./link";
import { useAtlasRegion } from "./region-context";
import { compositionLaunchPath } from "@/lib/compositions/build-launch";
import type { roles } from "@/lib/compositions/roles";
import { UsersRound } from "lucide-react";
export function BuildCompositionLink({
  fromBuild,
  fromLibrary,
  role,
  label = "Add to comp",
  className = "button secondary",
}: {
  fromBuild?: string;
  fromLibrary?: string;
  role?: (typeof roles)[number];
  label?: string;
  className?: string;
}) {
  const region = useAtlasRegion(),
    href = compositionLaunchPath({
      ...(fromBuild ? { fromBuild } : {}),
      ...(fromLibrary ? { fromLibrary } : {}),
      region,
      ...(role ? { role } : {}),
    });
  return (
    <Link href={href} className={className}>
      <UsersRound size={16} />
      {label}
    </Link>
  );
}
