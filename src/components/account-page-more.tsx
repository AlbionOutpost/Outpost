"use client";
import { useEffect, useRef, useState } from "react";

export function appendAccountRows<T extends { id: string }>(current: T[], incoming: T[]) {
  const ids = new Set(current.map((row) => row.id));
  return [...current, ...incoming.filter((row) => !ids.has(row.id))];
}

export function AccountPageMore<T extends { id: string }>({
  url,
  cursor,
  onPage,
  disabled,
  label,
}: {
  url: string;
  cursor: string | null;
  onPage: (rows: T[], cursor: string | null) => void;
  disabled?: boolean;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
    },
    [url, cursor],
  );
  if (!cursor) return null;
  return (
    <div>
      <button
        type="button"
        className="button secondary"
        disabled={disabled || busy}
        onClick={async () => {
          const controller = new AbortController();
          pending.current?.abort();
          pending.current = controller;
          setBusy(true);
          setError("");
          try {
            const next = new URL(url, window.location.origin);
            next.searchParams.set("cursor", cursor);
            const response = await fetch(next.pathname + next.search, {
              signal: controller.signal,
            });
            const rows = await response.json();
            if (!response.ok) throw new Error(rows.error || "Could not load older entries.");
            if (!Array.isArray(rows)) throw new Error("Could not load older entries.");
            if (!controller.signal.aborted) onPage(rows, response.headers.get("X-Next-Cursor"));
          } catch (e) {
            if (!controller.signal.aborted)
              setError(e instanceof Error ? e.message : "Could not load older entries.");
          } finally {
            if (pending.current === controller) setBusy(false);
          }
        }}
      >
        {busy ? "Loading…" : label}
      </button>
      {error && <p role="status">{error}</p>}
    </div>
  );
}
