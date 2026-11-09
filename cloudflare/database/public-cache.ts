/** Public catalog and archive reads, kept for a few minutes in this data Worker isolate. Both
 * change only through reviewed imports (the catalog is staged once per release, the archive by
 * the "Library data" workflow), so a repeat read inside the window returns the same answer
 * without reading D1 again. Concurrent identical reads share one query. Never for private data. */
const TTL_MS = 5 * 60_000,
  MAX_ENTRIES = 300,
  MAX_KEY = 4_000;
const entries = new Map<string, { expires: number; value: Promise<unknown> }>();

export function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (key.length > MAX_KEY) return load();
  const now = Date.now(),
    hit = entries.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;
  entries.delete(key);
  const value = load();
  entries.set(key, { expires: now + TTL_MS, value });
  // Oldest first: Map keeps insertion order.
  if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  // A failed read is never served again.
  value.catch(() => {
    if (entries.get(key)?.value === value) entries.delete(key);
  });
  return value;
}
