"use client";
import { createContext, useContext, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChartNoAxesCombined, History, Star } from "lucide-react";

/** Market Explorer's side column shows one panel at a time: Price history or Research & watchlist. */
export type MarketView = "history" | "saved";
export const marketViewPanels: Record<MarketView, string> = {
  history: "market-history-research",
  saved: "market-saved-research",
};
const views = [
  { key: "history", label: "Price history", icon: <History size={16} aria-hidden="true" /> },
  { key: "saved", label: "Research & watchlist", icon: <Star size={16} aria-hidden="true" /> },
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

/** The masthead's market sections: City orders jumps to the table, the two tabs pick the side panel. */
export function MarketViewTabs() {
  const { view, show } = useMarketView();
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
    <nav className="masthead-tabs" aria-label="Market sections">
      <a href="#market-board-title">
        <ChartNoAxesCombined size={16} aria-hidden="true" />
        City orders
      </a>
      <div role="tablist" aria-label="Side panel">
        {views.map(({ key, label, icon }, index) => (
          <button
            type="button"
            role="tab"
            key={key}
            id={marketViewTabId(key)}
            aria-controls={marketViewPanels[key]}
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
    </nav>
  );
}
