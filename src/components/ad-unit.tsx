"use client";
import { useEffect, useRef } from "react";

type AdQueue = unknown[];

/** One responsive AdSense unit; asks Google's script (loaded in the head) to fill it once. */
export function AdUnit({ client, slot }: { client: string; slot: string }) {
  const unit = useRef<HTMLModElement>(null);
  useEffect(() => {
    if (!unit.current || unit.current.dataset.adsbygoogleStatus) return;
    const w = window as typeof window & { adsbygoogle?: AdQueue };
    try {
      (w.adsbygoogle ||= []).push({});
    } catch {
      // A blocked or failed ad leaves the reserved space empty; the page is unaffected.
    }
  }, []);
  return (
    <ins
      ref={unit}
      className="adsbygoogle ad-slot-unit"
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
