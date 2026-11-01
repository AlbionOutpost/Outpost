"use client";
import { createContext, useContext } from "react";
import type { Region } from "@/lib/albion/region-config";
export const RegionContext = createContext<Region>("europe");
export function useAtlasRegion() {
  return useContext(RegionContext);
}
