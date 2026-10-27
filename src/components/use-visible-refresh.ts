"use client";
import { useEffect, useState } from "react";

/** Refresh public observations only while the document is visible and the browser is online. */
export function useVisibleRefresh(intervalMs = 60000) {
  const [revision, setRevision] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    let lastCheck = Date.now();
    const refresh = () => {
      if (
        document.visibilityState !== "visible" ||
        navigator.onLine === false ||
        Date.now() - lastCheck < intervalMs
      )
        return;
      lastCheck = Date.now();
      setRevision((value) => value + 1);
    };
    const timer = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [intervalMs, paused]);
  return { revision, paused, setPaused, refresh: () => setRevision((value) => value + 1) };
}
