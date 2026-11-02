"use client";
import { useEffect, useRef, useState } from "react";

/**
 * One fetch per key, aborted when the key changes. The result is keyed so a stale answer is
 * never shown for a newer selection. An explicit retention scope may keep a labelled prior
 * quote during same-region refreshes; crossing that scope always clears it.
 */
export function useLoad<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  retainWithin?: string,
) {
  const [state, setState] = useState<{
    key: string;
    scope?: string;
    value?: T;
    error?: string;
  } | null>(null);
  const ref = useRef(load);
  useEffect(() => {
    ref.current = load;
  });
  useEffect(() => {
    const controller = new AbortController();
    ref
      .current(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setState({ key, scope: retainWithin, value });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setState((previous) => ({
            key,
            scope: retainWithin,
            value:
              retainWithin !== undefined && previous?.scope === retainWithin
                ? previous.value
                : undefined,
            error: e instanceof Error ? e.message : "Unavailable",
          }));
      });
    return () => controller.abort();
  }, [key, retainWithin]);
  if (state?.key === key) return { ...state, updating: false };
  return retainWithin !== undefined && state?.scope === retainWithin && state.value
    ? { ...state, updating: true }
    : null;
}
