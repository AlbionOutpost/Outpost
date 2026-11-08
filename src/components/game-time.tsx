"use client";
import { useSyncExternalStore } from "react";
import { gameTime, localTime, relativeTime } from "@/lib/game-time";

const noSubscription = () => () => {};
/** The viewer's timezone once the page runs in their browser; the server render has none. */
const viewerZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/**
 * "Mon 9 Nov · 04:57 UTC · 05:57 your time · in 23 h": game time first, then the viewer's
 * clock (after hydration, so server and browser render the same text first) and the distance.
 */
export function GameTime({ at, now }: { at: string | Date; now?: number | null }) {
  const zone = useSyncExternalStore(noSubscription, viewerZone, () => null);
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return <>Time unavailable</>;
  const local = zone ? localTime(date, zone) : null;
  return (
    <>
      <time dateTime={date.toISOString()}>{gameTime(date)}</time>
      {local && ` · ${local}`}
      {now != null && ` · ${relativeTime(date, now)}`}
    </>
  );
}
