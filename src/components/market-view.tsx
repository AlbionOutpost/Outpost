"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChartNoAxesCombined, History, Star } from "lucide-react";
import styles from "./market-view.module.css";

/** Market Explorer's side column shows one panel at a time: Price history or Research & watchlist. */
export type MarketView = "history" | "saved";
export const marketViewPanels: Record<MarketView, string> = {
  history: "market-history-research",
  saved: "market-saved-research",
};
const views = [
  {
    key: "history",
    label: "Price history",
    short: "History",
    icon: <History size={16} aria-hidden="true" />,
  },
  {
    key: "saved",
    label: "Research & watchlist",
    short: "Research",
    icon: <Star size={16} aria-hidden="true" />,
  },
] as const;

const MarketViewContext = createContext<{ view: MarketView; show: (view: MarketView) => void }>({
  view: "history",
  show: () => {},
});

export function MarketViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<MarketView>("history");
  const show = (next: MarketView) => {
    setView(next);
    // Where the columns stack the panel sits below the orders, so bring it into view.
    if (window.matchMedia("(max-width: 1279px)").matches)
      requestAnimationFrame(() =>
        document.getElementById(marketViewPanels[next])?.scrollIntoView({ block: "start" }),
      );
  };
  return <MarketViewContext value={{ view, show }}>{children}</MarketViewContext>;
}

export const useMarketView = () => useContext(MarketViewContext);

export const marketViewTabId = (view: MarketView) => `market-view-${view}`;

/** Marks a sideways-scrolling row's ends, so only an edge with more beyond it fades. */
function markEdges(row: HTMLElement) {
  row.toggleAttribute("data-at-start", row.scrollLeft <= 1);
  row.toggleAttribute("data-at-end", row.scrollLeft + row.clientWidth >= row.scrollWidth - 1);
}

/** The masthead's market sections: City orders jumps to the table, the two tabs pick the side panel.
 * On phones the row scrolls sideways and keeps the chosen tab in view. */
export function MarketViewTabs() {
  const { view, show } = useMarketView();
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const row = nav.current;
    const tab = row?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!row || !tab) return;
    const left =
      tab.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
    // Bring the tab fully clear of the edge fades; a row that fits does not move.
    if (left < row.scrollLeft + 24) row.scrollLeft = left - 16;
    else if (left + tab.offsetWidth > row.scrollLeft + row.clientWidth - 40)
      row.scrollLeft = left + tab.offsetWidth - row.clientWidth + 40;
    markEdges(row);
  }, [view]);
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next =
      e.key === "ArrowRight" || e.key === "ArrowLeft"
        ? 1 - index
        : e.key === "Home"
          ? 0
          : e.key === "End"
            ? 1
            : null;
    if (next === null) return;
    e.preventDefault();
    show(views[next].key);
    document.getElementById(marketViewTabId(views[next].key))?.focus();
  };
  return (
    <nav
      ref={nav}
      className={`masthead-tabs ${styles.tabs}`}
      aria-label="Market sections"
      onScroll={(e) => markEdges(e.currentTarget)}
    >
      <a href="#market-board-title" aria-label="City orders">
        <ChartNoAxesCombined size={16} aria-hidden="true" />
        <Label full="City orders" short="Orders" />
      </a>
      <div role="tablist" aria-label="Side panel">
        {views.map(({ key, label, short, icon }, index) => (
          <button
            type="button"
            role="tab"
            key={key}
            id={marketViewTabId(key)}
            aria-label={label}
            aria-controls={marketViewPanels[key]}
            aria-selected={view === key}
            tabIndex={view === key ? 0 : -1}
            onClick={() => show(key)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {icon}
            <Label full={label} short={short} />
          </button>
        ))}
      </div>
    </nav>
  );
}

/** Phones show a one-word label so the three pills fit one row; the full name is the tab's name. */
function Label({ full, short }: { full: string; short: string }) {
  return (
    <>
      <span className={styles.full}>{full}</span>
      <span className={styles.short} aria-hidden="true">
        {short}
      </span>
    </>
  );
}
