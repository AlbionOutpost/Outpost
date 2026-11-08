/**
 * Albion runs on UTC ("game time"); players also think in their own clock. These format one
 * stored instant both ways, plus how far away it is. Nothing here changes a stored value.
 */
const format = (at: Date, timeZone: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...options, timeZone }).format(at);
const day = { weekday: "short", day: "numeric", month: "short" } as const;
const clock = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } as const;

/** "Mon 9 Nov · 04:57 UTC". */
export const gameTime = (at: Date) => `${format(at, "UTC", day)} · ${format(at, "UTC", clock)} UTC`;

/**
 * "05:57 your time", with the day when it differs from the UTC day ("Tue 10 Nov 01:30 your
 * time"); null when the viewer's clock is UTC, so the time is not said twice.
 */
export function localTime(at: Date, timeZone: string) {
  const time = format(at, timeZone, clock);
  if (time === format(at, "UTC", clock) && format(at, timeZone, day) === format(at, "UTC", day))
    return null;
  const date = format(at, timeZone, day);
  return `${date === format(at, "UTC", day) ? "" : `${date} `}${time} your time`;
}

/** "in 23 h", "in 45 min", "in 3 days", "2 h ago", "now". */
export function relativeTime(at: Date, now: number) {
  const minutes = Math.round((at.getTime() - now) / 60_000);
  const size = Math.abs(minutes);
  if (size < 1) return "now";
  const span =
    size < 60
      ? `${size} min`
      : size < 48 * 60
        ? `${Math.round(size / 60)} h`
        : `${Math.round(size / 1440)} days`;
  return minutes > 0 ? `in ${span}` : `${span} ago`;
}
