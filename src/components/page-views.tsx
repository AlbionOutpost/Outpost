"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/**
 * One working panel at a time on a tool page, picked by pill tabs in the masthead (as Market
 * Explorer's side panel): `PageViews` holds the choice, `PageViewTabs` sits in the masthead's
 * `actions`, and each `PageView` is the panel it shows. Hidden panels stay mounted, so what a
 * player typed survives switching. A link whose hash starts with a key of `hashViews` (a shared
 * scenario, `#trade`) opens that view.
 */
type View = { key: string; label: string; icon?: ReactNode };
const Context = createContext<{ id: string; view: string; show: (view: string) => void }>({
  id: "",
  view: "",
  show: () => {},
});

export function PageViews({
  id,
  initial,
  hashViews,
  children,
}: {
  /** Prefix for the tab and panel ids. */
  id: string;
  initial: string;
  hashViews?: Record<string, string>;
  children: ReactNode;
}) {
  const [view, setView] = useState(initial);
  useEffect(() => {
    const followHash = () => {
      const match = Object.entries(hashViews ?? {}).find(([hash]) =>
        location.hash.startsWith(hash),
      );
      if (match) setView(match[1]);
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, [hashViews]);
  return <Context value={{ id, view, show: setView }}>{children}</Context>;
}

export function PageViewTabs({ label, views }: { label: string; views: View[] }) {
  const { id, view, show } = useContext(Context);
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = views.length - 1;
    const next =
      e.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : e.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    show(views[next].key);
    document.getElementById(`${id}-tab-${views[next].key}`)?.focus();
  };
  return (
    <div className="masthead-tabs">
      <div role="tablist" aria-label={label}>
        {views.map(({ key, label, icon }, index) => (
          <button
            type="button"
            role="tab"
            key={key}
            id={`${id}-tab-${key}`}
            aria-controls={`${id}-${key}`}
            aria-selected={view === key}
            tabIndex={view === key ? 0 : -1}
            onClick={() => show(key)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PageView({
  view: key,
  className,
  children,
}: {
  view: string;
  className?: string;
  children: ReactNode;
}) {
  const { id, view } = useContext(Context);
  return (
    <div
      role="tabpanel"
      id={`${id}-${key}`}
      aria-labelledby={`${id}-tab-${key}`}
      className={className}
      hidden={view !== key}
    >
      {children}
    </div>
  );
}
