"use client";
import "./tool-directory.css";
import Link from "@/components/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowUpRight, X, Pin } from "lucide-react";
import { tools, toolGroups, toolPaintings } from "@/lib/tool-directory";
import { ToolIcon } from "./tool-icon";
import { parseToolShortcuts, TOOL_SHORTCUT_KEY } from "@/lib/tool-shortcuts";
import { useOutpostRegion } from "./region-context";
import { WorkspaceHeading } from "./workspace-heading";
import { SearchInput } from "./field";

type Tool = (typeof tools)[number];
/** The four tools most players come for, large at the top, with what each one answers. */
const featured: Record<string, string> = {
  "/tools/market": "Every city's buy and sell orders for one item, with how old each price is.",
  "/tools/crafting": "Price a batch before you craft it: materials, returns, fees and profit.",
  "/tools/flipping": "Find items that sell for more in another city, after tax and fees.",
  "/tools/black-market": "Gear the Black Market pays more for than any city sells it, after tax.",
};
/** Everything else, by category; the order inside each is the order players reach for them. */
const order = [
  "/tools/profitable-crafts",
  "/shopping-list",
  "/tools/refining",
  "/tools/enchanting",
  "/tools/cooking",
  "/tools/alchemy",
  "/tools/transporting",
  "/tools/farming",
  "/tools/fishing",
  "/tools/laborers",
  "/tools/mastery",
  "/tools/gold",
  "/tools/avalon-mapper",
  "/tools/reference",
  "/builds/new",
  "/compositions/new",
  "/items",
  "/builds",
  "/tools/kill-feed",
  "/groups",
  "/timers",
];
function subscribeToolShortcuts(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("outpost:tool-shortcuts", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("outpost:tool-shortcuts", callback);
  };
}
function readToolShortcuts() {
  try {
    return localStorage.getItem(TOOL_SHORTCUT_KEY) || "[]";
  } catch {
    return "[]";
  }
}
/** The tool's own painted emblem, else its line glyph in a small well of the same size. */
function ToolMark({ tool, size }: { tool: Tool; size: number }) {
  const painting = toolPaintings[tool.href];
  return painting ? (
    // eslint-disable-next-line @next/next/no-img-element -- owner-supplied task emblem
    <img src={`/albion/icons/${painting}.webp`} alt="" width={size} height={size} />
  ) : (
    <span className="tool-mark well">
      <ToolIcon name={tool.icon} size={Math.round(size * 0.46)} />
    </span>
  );
}
export function ToolDirectory() {
  const region = useOutpostRegion();
  const rawPins = useSyncExternalStore(subscribeToolShortcuts, readToolShortcuts, () => "[]");
  const pins = parseToolShortcuts(
    rawPins,
    tools.map((tool) => tool.href),
  );
  const [pinMessage, setPinMessage] = useState("");
  function togglePin(href: string) {
    if (!pins.includes(href) && pins.length >= 6) {
      setPinMessage("Six tools are pinned. Unpin one to make room.");
      return;
    }
    const next = pins.includes(href) ? pins.filter((path) => path !== href) : [...pins, href];
    try {
      localStorage.setItem(TOOL_SHORTCUT_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("outpost:tool-shortcuts"));
      setPinMessage(
        pins.includes(href) ? "Tool unpinned from this device." : "Tool pinned on this device.",
      );
    } catch {
      setPinMessage("This browser could not save the shortcut. Your tools remain available below.");
    }
  }
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All tools");
  const matches = tools.filter(
    (t) =>
      (category === "All tools" || t.group === category) &&
      `${t.title} ${t.description} ${t.state} ${featured[t.href] ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  /** One tool: a large card with its pitch when featured, else a compact row. */
  function entry(tool: Tool, pitch?: string) {
    const pinned = pins.includes(tool.href);
    return (
      <article
        key={tool.href}
        className={`raised is-link directory-entry${pitch ? " is-featured" : ""}`}
      >
        <Link className="directory-entry-link" href={`${tool.href}?region=${region}`}>
          <span className="tool-symbol" aria-hidden="true">
            <ToolMark tool={tool} size={pitch ? 56 : 32} />
          </span>
          <span className="directory-entry-copy">
            <h3>{tool.title}</h3>
            <p>{pitch ?? tool.description}</p>
          </span>
          {pitch && <ArrowUpRight className="directory-arrow" size={18} aria-hidden="true" />}
        </Link>
        <button
          type="button"
          className="directory-pin"
          aria-pressed={pinned}
          aria-label={`${pinned ? "Unpin" : "Pin"} ${tool.title} on this device`}
          onClick={() => togglePin(tool.href)}
        >
          <Pin size={pitch ? 16 : 14} aria-hidden="true" />
        </button>
      </article>
    );
  }
  return (
    <div className="directory-page support-tools-directory">
      <WorkspaceHeading
        glyph="craft"
        scene="economy"
        title="All tools"
        accent="tools"
        description="Every tool for prices, crafting, gear and your Team. Pin the ones you use most to this device."
      />
      <div className="directory-toolbar">
        <label className="directory-search">
          <span className="sr-only">Find a tool</span>
          <SearchInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
          />
          {query && (
            <button type="button" aria-label="Clear tool search" onClick={() => setQuery("")}>
              <X size={16} />
            </button>
          )}
        </label>
        <nav className="directory-categories" aria-label="Tool categories">
          {["All tools", ...toolGroups].map((group) => (
            <button
              type="button"
              key={group}
              aria-pressed={category === group}
              onClick={() => setCategory(group)}
            >
              {group}
            </button>
          ))}
        </nav>
        <span className="directory-count">
          <span role="status">
            {matches.length} {matches.length === 1 ? "tool" : "tools"}
          </span>
          {!pins.length && (
            <span className="tool-pin-help">
              <Pin size={14} aria-hidden="true" /> Pin up to six on this device
            </span>
          )}
        </span>
      </div>
      {pins.length > 0 && !query && category === "All tools" ? (
        <section className="tool-shortcuts" aria-label="Tool shortcuts on this device">
          <h2>Pinned on this device</h2>
          <div>
            {tools
              .filter((tool) => pins.includes(tool.href))
              .map((tool) => (
                <Link key={tool.href} href={`${tool.href}?region=${region}`}>
                  <ToolMark tool={tool} size={28} />
                  <strong>{tool.title}</strong>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              ))}
          </div>
        </section>
      ) : null}
      {pinMessage && (
        <p className="tool-pin-feedback" role="status">
          {pinMessage}
        </p>
      )}
      {matches.some((t) => featured[t.href]) && (
        <section className="directory-featured" aria-label="Most used tools">
          {Object.keys(featured).map((href) => {
            const tool = matches.find((t) => t.href === href);
            return tool ? entry(tool, featured[href]) : null;
          })}
        </section>
      )}
      <div className="directory-groups">
        {toolGroups.map((group) => {
          const rows = order
            .map((href) => matches.find((t) => t.href === href && t.group === group))
            .filter((t): t is Tool => !!t);
          const id = `tools-${group.toLowerCase().replace(/[^a-z]+/g, "-")}`;
          return rows.length ? (
            <section
              className="directory-group"
              key={group}
              data-wide={rows.length > 4 || undefined}
              aria-labelledby={id}
            >
              <h2 id={id}>
                {group}
                <span className="directory-chip">{rows.length}</span>
              </h2>
              <div className="directory-entries">{rows.map((t) => entry(t))}</div>
            </section>
          ) : null;
        })}
      </div>
      {!matches.length && (
        <div className="directory-empty">
          <h2>No tools match “{query}”</h2>
          <p>Try a task such as prices, equipment or events.</p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setQuery("");
              setCategory("All tools");
            }}
          >
            Reset search
          </button>
        </div>
      )}
      <p className="directory-footnote">
        Recipes and game tables come from game data captured 27 Oct 2026. Prices come from the
        Albion Online Data Project and can be missing; you can always type your own.
      </p>
    </div>
  );
}
