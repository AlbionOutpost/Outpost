"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useOutpostRegion } from "@/components/region-context";
import type { LandingData } from "@/lib/landing-data";
import { useLoad } from "./use-load";

type Loaded = { data: LandingData; at: number };
type State = ReturnType<typeof useLoad<Loaded>>;
const LandingDataContext = createContext<State>(null);

/**
 * One `/api/landing` request feeds every live preview on the homepage, for the server picked in
 * the header; switching server loads that server's answer and never shows the previous one.
 */
export function LandingDataProvider({ children }: { children: ReactNode }) {
  const region = useOutpostRegion();
  const state = useLoad(region, async (signal) => {
    const r = await fetch(`/api/landing?${new URLSearchParams({ region })}`, { signal });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || "Live previews are unavailable.");
    if (body.region !== region) throw new Error("Live previews are unavailable.");
    return { data: body as LandingData, at: Date.now() };
  });
  return <LandingDataContext.Provider value={state}>{children}</LandingDataContext.Provider>;
}

type Part<K extends keyof LandingData> = Extract<LandingData[K], { ok: true }>;
/**
 * One part of the homepage answer in `useLoad`'s shape: `null` while loading, `error` when the
 * whole request or just this part failed, otherwise `value` with the time it arrived.
 */
export function useLandingPart<K extends "market" | "history" | "craft" | "planner" | "kills">(
  key: K,
): { value?: Part<K>; error?: string; at: number; updating: boolean } | null {
  const state = useContext(LandingDataContext);
  if (!state) return null;
  if (!state.value) return { error: state.error, at: 0, updating: state.updating };
  const part = state.value.data[key];
  return part.ok
    ? { value: part as Part<K>, at: state.value.at, updating: state.updating }
    : { error: part.error, at: state.value.at, updating: state.updating };
}
