import { isStale, sourceTimestamp } from "./freshness";

/** "12 min ago" style label for a source timestamp; never rounds a missing stamp to "now". */
export function sourceAge(date: string | null | undefined, now = Date.now()) {
  if (!date) return { label: "Unavailable", stale: true, known: false };
  const stamp = sourceTimestamp(date);
  if (!Number.isFinite(stamp)) return { label: "Unknown time", stale: true, known: false };
  const minutes = Math.max(0, Math.round((now - stamp) / 60000));
  const label =
    minutes < 1
      ? "just now"
      : minutes < 60
        ? `${minutes} min ago`
        : minutes < 48 * 60
          ? `${Math.round(minutes / 60)} h ago`
          : `${Math.round(minutes / 1440)} d ago`;
  return { label, stale: isStale(date, now), known: true };
}
