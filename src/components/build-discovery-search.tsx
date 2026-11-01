"use client";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
export function BuildDiscoverySearch({
  value,
  formId,
  label = "Search",
  placeholder = "Weapon, title or author",
  compact = false,
}: {
  value: string;
  formId: string;
  label?: string;
  placeholder?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState({ source: value, draft: value, submitted: value }),
    [pending, startTransition] = useTransition(),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    router = useRouter(),
    params = useSearchParams();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (state.source !== value) {
    const settled = state.draft === state.submitted;
    setState({
      source: value,
      draft: settled ? value : state.draft,
      submitted: settled ? value : state.submitted,
    });
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function schedule(next: string) {
    setState((s) => ({ ...s, draft: next }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (next.trim() === (params.get("q") || "")) return;
      const form = document.getElementById(formId) as HTMLFormElement | null;
      if (!form) return;
      const query = new URLSearchParams(params.toString());
      for (const [key, v] of new FormData(form)) {
        if (typeof v === "string") query.set(key, v);
      }
      query.set("q", next.trim());
      query.delete("page");
      setState((s) => ({ ...s, submitted: next }));
      startTransition(() =>
        router.replace(`${form.action.split("?")[0]}?${query}`, { scroll: false }),
      );
    }, 450);
  }
  return (
    <label className="ecosystem-search-label">
      <span className={compact ? "sr-only" : undefined}>{label}</span>
      <input
        form={formId}
        type="search"
        name="q"
        value={state.draft}
        placeholder={placeholder}
        maxLength={100}
        disabled={!hydrated}
        aria-busy={!hydrated || pending}
        aria-label={label}
        onChange={(e) => schedule(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && timer.current) clearTimeout(timer.current);
        }}
      />
      <span className="sr-only" role="status">
        {pending ? "Updating matching builds" : ""}
      </span>
    </label>
  );
}
