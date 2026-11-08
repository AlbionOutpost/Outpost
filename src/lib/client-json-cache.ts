/**
 * A browser-side cache for public JSON answers (market prices, price history, catalog versions).
 * Callers asking for the same URL at once share one request, and a successful answer is reused
 * until it expires, so switching back to an item a player just looked at costs no request and
 * no wait. Failures are never kept. `fresh` (Refresh, Try again) always asks the server again.
 * The TTLs match the server's own source caches, so a reuse never shows older data than the
 * server would have answered with.
 */
export class JsonRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Entry = { promise: Promise<unknown>; until: number; settled: boolean; value?: unknown };

export function createJsonCache({
  ttlMs,
  max = 64,
  fetcher = (url: string) => fetch(url),
  now = Date.now,
}: {
  ttlMs: number;
  max?: number;
  fetcher?: (url: string) => Promise<Response>;
  now?: () => number;
}) {
  const entries = new Map<string, Entry>();
  const live = (url: string) => {
    const entry = entries.get(url);
    if (entry && entry.settled && entry.until <= now()) entries.delete(url);
    return entries.get(url);
  };
  return {
    /** The answer, when one is already here and still fresh (no request, no wait). */
    peek(url: string): unknown {
      const entry = live(url);
      return entry?.settled ? entry.value : undefined;
    },
    get(url: string, { fresh = false }: { fresh?: boolean } = {}): Promise<unknown> {
      const entry = live(url);
      if (entry && !(fresh && entry.settled)) return entry.promise;
      const next: Entry = { promise: Promise.resolve(), until: Infinity, settled: false };
      next.promise = fetcher(url).then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok)
          throw new JsonRequestError(
            (body as { error?: string } | null)?.error || "Request failed",
            response.status,
          );
        return body;
      });
      next.promise.then(
        (value) => {
          if (entries.get(url) !== next) return;
          Object.assign(next, { settled: true, value, until: now() + ttlMs });
        },
        () => {
          if (entries.get(url) === next) entries.delete(url);
        },
      );
      entries.delete(url);
      entries.set(url, next);
      // Oldest first: drop answers past the size bound, never one still in flight.
      for (const [key, old] of entries) {
        if (entries.size <= max) break;
        if (old.settled) entries.delete(key);
      }
      return next.promise;
    },
  };
}

/** Resolves with `promise`, or rejects with an AbortError once `signal` aborts. The shared
 * request itself carries on, so another caller (or a later visit) can still use its answer. */
export function withSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

/** Market Explorer's caches: the server keeps prices 60 s and history 5 min. */
export const marketPriceCache = createJsonCache({ ttlMs: 60_000 });
export const marketHistoryCache = createJsonCache({ ttlMs: 300_000 });
/** Catalog versions come from the pinned game data; they change only with a deploy. */
export const catalogVariantCache = createJsonCache({ ttlMs: 30 * 60_000, max: 128 });
