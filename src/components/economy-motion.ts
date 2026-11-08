"use client";
import { useEffect, useRef, useState } from "react";

/** Fired after a change elsewhere on the page moved wallet balances; the Treasury reads again. */
export const walletChangedEvent = "outpost:team-wallet-changed";

/** Small helpers shared by the Treasury hero, the wallet and the 3D moments. */

export function prefersReducedMotion() {
  return typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches;
}
/** A fresh idempotency key: a retried request with the same key is booked once. */
export const operationKey = () => crypto.randomUUID().replaceAll("-", "");
export const silverText = (n: number) => n.toLocaleString("en");
/** A signed amount for a ledger line: "+1,000", "−250". */
export const signedSilver = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${silverText(Math.abs(n))}`;

/** Counts a number up (or down) to `value`; jumps straight there under reduced motion. */
export function useCountUp(
  value: number,
  { duration = 900, from }: { duration?: number; from?: number } = {},
) {
  const [shown, setShown] = useState(from ?? value);
  const last = useRef(from ?? value);
  useEffect(() => {
    const start = last.current;
    last.current = value;
    if (start === value || duration <= 0 || prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return shown;
}
