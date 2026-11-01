"use client";
import { useEffect, useRef, useState } from "react";

/**
 * One fetch per key, aborted when the key changes. The result is keyed so a stale answer is
 * never shown for a newer selection, and no loading flag has to be set in an effect.
 */
export function useLoad<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ key: string; value?: T; error?: string } | null>(null);
  const ref = useRef(load);
  useEffect(() => {
    ref.current = load;
  });
  useEffect(() => {
    const controller = new AbortController();
    ref
      .current(controller.signal)
      .then((value) => setState({ key, value }))
      .catch((e) => {
        if (!controller.signal.aborted)
          setState({ key, error: e instanceof Error ? e.message : "Unavailable" });
      });
    return () => controller.abort();
  }, [key]);
  return state?.key === key ? state : null;
}
