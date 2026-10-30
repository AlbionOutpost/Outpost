"use client";
import "./tool-directory.css";
import Link from "@/components/link";
import { useState, useSyncExternalStore } from "react";
import { Search, ArrowUpRight, X, Pin } from "lucide-react";
import { tools, toolGroups } from "@/lib/tool-directory";
import { ToolIcon } from "./tool-icon";
import { parseToolShortcuts, TOOL_SHORTCUT_KEY } from "@/lib/tool-shortcuts";
import { useAtlasRegion } from "./region-context";
import { WorkspaceHeading } from "./workspace-heading";
// Each tool crops one of the five paintings so the directory reads as places, not a list.
const scenes: Record<string, { scene: string; at: string }> = {
  "/tools/market": { scene: "market", at: "30% 40%" },
  "/shopping-list": { scene: "city", at: "88% 60%" },
  "/tools/flipping": { scene: "hero", at: "70% 60%" },
  "/tools/crafting": { scene: "hero", at: "25% 50%" },
  "/tools/cooking": { scene: "market", at: "75% 70%" },
  "/tools/alchemy": { scene: "composition", at: "60% 40%" },
  "/tools/fishing": { scene: "city", at: "20% 72%" },
  "/tools/refining": { scene: "build", at: "30% 35%" },
  "/tools/enchanting": { scene: "hero", at: "88% 30%" },
  "/tools/farming": { scene: "city", at: "55% 85%" },
  "/tools/transporting": { scene: "market", at: "10% 75%" },
  "/tools/laborers": { scene: "composition", at: "15% 65%" },
  "/tools/mastery": { scene: "build", at: "75% 55%" },
  "/tools/reference": { scene: "city", at: "40% 40%" },
  "/tools/avalon-mapper": { scene: "city", at: "50% 12%" },
  "/tools/gold": { scene: "market", at: "55% 25%" },
  "/builds/new": { scene: "build", at: "50% 40%" },
  "/builds": { scene: "hero", at: "50% 75%" },
  "/items": { scene: "market", at: "90% 50%" },
  "/compositions/new": { scene: "composition", at: "50% 40%" },
  "/groups": { scene: "city", at: "80% 55%" },
  "/timers": { scene: "hero", at: "10% 30%" },
  "/tools/kill-feed": { scene: "build", at: "15% 70%" },
  "/tools/death-feed": { scene: "composition", at: "85% 30%" },
};
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
export function ToolDirectory() {
  const region = useAtlasRegion();
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
      `${t.title} ${t.description} ${t.state}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="directory-page support-tools-directory">
      <WorkspaceHeading
        glyph="craft"
        scene="economy"
        title="Tools"
        description="Everything you need to make better decisions in Albion Online: prices, profit, gear and your team."
      />
      {!!pins.length && !query && category === "All tools" && (
        <section className="tool-shortcuts" aria-label="Tool shortcuts on this device">
          <div className="support-section-heading">
            <h2>{pins.length ? "Your shortcuts" : "Start with a task"}</h2>
            <small>
              {pins.length ? "Pinned on this device" : "Pin up to six tools for next time"}
            </small>
          </div>
          <div>
            {(pins.length
              ? tools.filter((tool) => pins.includes(tool.href))
              : tools.filter((tool) =>
                  ["/tools/market", "/tools/crafting", "/builds/new"].includes(tool.href),
                )
            ).map((tool) => (
              <Link key={tool.href} href={`${tool.href}?region=${region}`}>
                <ToolIcon name={tool.icon} size={22} />
                <strong>{tool.title}</strong>
                <ArrowUpRight size={15} />
              </Link>
            ))}
          </div>
        </section>
      )}
      <p className="tool-pin-feedback" role="status">
        {pinMessage}
      </p>
      <div className="directory-toolbar">
        <label className="directory-search">
          <Search size={18} />
          <span className="sr-only">Find a tool</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets, crafting, builds…"
          />
          {query && (
            <button aria-label="Clear tool search" onClick={() => setQuery("")}>
              <X size={16} />
            </button>
          )}
        </label>
        <span role="status">{matches.length} tools</span>
      </div>
      <nav className="product-tabs" aria-label="Tool categories">
        {["All tools", ...toolGroups].map((group) => (
          <button key={group} aria-pressed={category === group} onClick={() => setCategory(group)}>
            {group}
          </button>
        ))}
      </nav>
      {!pins.length && !query && (
        <p className="tool-pin-help">Pin up to six shortcuts on this device for your next visit.</p>
      )}
      <div className="directory-groups">
        {toolGroups.map((group) => {
          const rows = matches.filter((t) => t.group === group);
          return rows.length ? (
            <section
              className={`directory-group ${group === "Economy" ? "directory-economy" : ""}`}
              key={group}
            >
              <div className="directory-group-heading">
                <h2>{group}</h2>
                <span>{rows.length}</span>
              </div>
              <div className="directory-entries">
                {rows.map((t) => (
                  <article
                    className="directory-entry"
                    key={t.href}
                    data-scene={scenes[t.href]?.scene ?? "hero"}
                    style={{ "--scene-at": scenes[t.href]?.at ?? "center" } as React.CSSProperties}
                  >
                    <Link className="directory-entry-link" href={`${t.href}?region=${region}`}>
                      <span className="directory-entry-art" aria-hidden="true" />
                      <span className="tool-symbol" aria-hidden="true">
                        <ToolIcon name={t.icon} size={20} />
                      </span>
                      <div>
                        <h3>{t.title}</h3>
                        <p>{t.description}</p>
                        <span className="tool-availability">{t.state}</span>
                      </div>
                      <ArrowUpRight className="directory-arrow" size={17} />
                    </Link>
                    <button
                      type="button"
                      className="directory-pin"
                      aria-pressed={pins.includes(t.href)}
                      aria-label={`${pins.includes(t.href) ? "Unpin" : "Pin"} ${t.title} on this device`}
                      onClick={() => togglePin(t.href)}
                    >
                      <Pin size={16} />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null;
        })}
      </div>
      {!matches.length && (
        <section className="product-empty">
          <Search size={28} />
          <h2>No tools match “{query}”</h2>
          <p>Try a task such as prices, equipment or events.</p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setCategory("All tools");
            }}
          >
            Reset search
          </button>
        </section>
      )}
      <p className="directory-footnote">
        Crafting, refining and enchanting cover supported starter data. Full recipe and
        current-patch verification remain incomplete. Sources can be unavailable; manual planning
        stays available where supported.
      </p>
    </div>
  );
}
