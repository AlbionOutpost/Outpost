"use client";

import {
  Children,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowRight } from "lucide-react";
import styles from "./tool-showcase.module.css";

const compactQuery = "(max-width: 780px)";
const subscribe = (listener: () => void) => {
  const query = matchMedia(compactQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
const getCompact = () => matchMedia(compactQuery).matches;
const serverCompact = () => false;
const tools = [
  {
    id: "market",
    title: "Market Explorer",
    short: "Market",
    icon: "tool-market",
    line: "Compare cities and find your price.",
  },
  {
    id: "crafting",
    title: "Crafting Calculator",
    short: "Crafting",
    icon: "tool-craft",
    line: "See the materials, costs and margin.",
  },
  {
    id: "planner",
    title: "Crafting Planner",
    short: "Planner",
    icon: "tool-planner",
    line: "Build a queue. Buy what is missing.",
  },
] as const;

/** All three real widgets stay mounted: switching previews never discards a player's inputs.
 * Inactive surfaces are inert and hidden, but reserve the largest natural preview height.
 */
export function ToolShowcase({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const compact = useSyncExternalStore(subscribe, getCompact, serverCompact);
  const panels = Children.toArray(children);
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    // Horizontal tabs leave vertical arrows available for normal page scrolling.
    if (compact && (event.key === "ArrowDown" || event.key === "ArrowUp")) return;
    let next: number;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tools.length - 1;
    else if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = (index + 1) % tools.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index + tools.length - 1) % tools.length;
    else return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus();
  };
  return (
    <div className={`tool-showcase ${styles.showcase}`}>
      <div className={styles.choices}>
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Explore Outpost tools"
          aria-orientation={compact ? "horizontal" : "vertical"}
        >
          {tools.map((tool, index) => (
            <div key={tool.id} className={styles.option} data-active={active === index}>
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied tool emblem */}
              <img src={`/albion/icons/${tool.icon}.webp`} alt="" width={48} height={48} />
              <div className={styles.label}>
                <button
                  ref={(node) => {
                    buttons.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`home-tool-tab-${tool.id}`}
                  aria-controls={`home-tool-panel-${tool.id}`}
                  aria-label={tool.title}
                  aria-describedby={`home-tool-description-${tool.id}`}
                  aria-selected={active === index}
                  tabIndex={active === index ? 0 : -1}
                  onClick={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onKeyDown={(event) => move(event, index)}
                  className={styles.tab}
                >
                  <strong className={styles.full}>{tool.title}</strong>
                  <strong className={styles.short}>{tool.short}</strong>
                </button>
                <p id={`home-tool-description-${tool.id}`} className={styles.description}>
                  {tool.line}
                </p>
              </div>
              <ArrowRight size={18} aria-hidden="true" />
            </div>
          ))}
        </div>
        <p className={styles.hint}>Try a tool here, then open it for the full workspace.</p>
      </div>
      <div className={`tool-showcase-preview ${styles.preview}`}>
        {tools.map((tool, index) => (
          <div
            key={tool.id}
            id={`home-tool-panel-${tool.id}`}
            role="tabpanel"
            aria-labelledby={`home-tool-tab-${tool.id}`}
            aria-hidden={active !== index}
            inert={active !== index}
            tabIndex={active === index ? 0 : -1}
            data-active={active === index}
            className={`tool-showcase-panel ${styles.panel}`}
          >
            {panels[index]}
          </div>
        ))}
      </div>
    </div>
  );
}
