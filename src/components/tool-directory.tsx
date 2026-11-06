"use client";
import "./tool-directory.css";
import Link from "@/components/link";
import { useState, useSyncExternalStore } from "react";
import { Search, ArrowUpRight, ArrowRight, X, Pin } from "lucide-react";
import { tools, toolGroups } from "@/lib/tool-directory";
import { parseToolShortcuts, TOOL_SHORTCUT_KEY } from "@/lib/tool-shortcuts";
import { useOutpostRegion } from "./region-context";
import { WorkspaceHeading } from "./workspace-heading";
import { SectionHeading } from "./section-heading";

type Tool = (typeof tools)[number];
// Each tool crops one of the five paintings so the directory reads as places, not a list.
const scenes: Record<string, { scene: string; at: string }> = {
  "/tools/market": { scene: "market", at: "30% 40%" },
  "/shopping-list": { scene: "city", at: "88% 60%" },
  "/tools/flipping": { scene: "economy", at: "70% 60%" },
  "/tools/crafting": { scene: "economy", at: "25% 50%" },
  "/tools/cooking": { scene: "market", at: "75% 70%" },
  "/tools/alchemy": { scene: "composition", at: "60% 40%" },
  "/tools/fishing": { scene: "city", at: "20% 72%" },
  "/tools/refining": { scene: "build", at: "30% 35%" },
  "/tools/enchanting": { scene: "economy", at: "88% 30%" },
  "/tools/farming": { scene: "city", at: "55% 85%" },
  "/tools/transporting": { scene: "market", at: "10% 75%" },
  "/tools/laborers": { scene: "composition", at: "15% 65%" },
  "/tools/mastery": { scene: "build", at: "75% 55%" },
  "/tools/reference": { scene: "city", at: "40% 40%" },
  "/tools/avalon-mapper": { scene: "city", at: "50% 12%" },
  "/tools/gold": { scene: "market", at: "55% 25%" },
  "/builds/new": { scene: "build", at: "50% 40%" },
  "/builds": { scene: "economy", at: "50% 75%" },
  "/items": { scene: "market", at: "90% 50%" },
  "/compositions/new": { scene: "composition", at: "50% 40%" },
  "/groups": { scene: "city", at: "80% 55%" },
  "/timers": { scene: "economy", at: "10% 30%" },
  "/tools/kill-feed": { scene: "build", at: "15% 70%" },
};
/** Tools with a painted emblem of their own; the rest show their line glyph in a medallion. */
const paintings: Record<string, string> = {
  "/tools/market": "tool-market",
  "/tools/crafting": "tool-craft",
  "/shopping-list": "tool-planner",
  "/tools/kill-feed": "kill-skull",
  "/builds/new": "strip-builds",
  "/compositions/new": "strip-comps",
  "/groups": "team-roles",
  "/timers": "team-calendar",
};
/** Sections of the directory, each inside one category filter; 3, 4 or 6 tools fill whole rows. */
const sections: {
  id: string;
  title: React.ReactNode;
  line: string;
  link?: { href: string; label: string };
  hrefs: string[];
}[] = [
  {
    id: "tools-trade",
    title: (
      <>
        Trade and <em>travel</em>
      </>
    ),
    line: "City prices, trade margins, cargo, gold, the Roads of Avalon and game tables.",
    link: { href: "/tools/market", label: "Open Market Explorer" },
    hrefs: [
      "/tools/market",
      "/tools/flipping",
      "/tools/transporting",
      "/tools/gold",
      "/tools/avalon-mapper",
      "/tools/reference",
    ],
  },
  {
    id: "tools-production",
    title: (
      <>
        Crafting and <em>production</em>
      </>
    ),
    line: "Costs, returns and the shopping list for what you make.",
    link: { href: "/shopping-list", label: "Open the Crafting Planner" },
    hrefs: [
      "/tools/crafting",
      "/shopping-list",
      "/tools/refining",
      "/tools/enchanting",
      "/tools/cooking",
      "/tools/alchemy",
    ],
  },
  {
    id: "tools-gathering",
    title: (
      <>
        Gathering and <em>focus</em>
      </>
    ),
    line: "Farms, fishing, laborers and the specs that cut your focus cost.",
    hrefs: ["/tools/farming", "/tools/fishing", "/tools/laborers", "/tools/mastery"],
  },
  {
    id: "tools-builds",
    title: (
      <>
        Builds and <em>comps</em>
      </>
    ),
    line: "Make a loadout, plan a party, look up an item.",
    link: { href: "/builds/library", label: "Build library" },
    hrefs: ["/builds/new", "/compositions/new", "/items"],
  },
  {
    id: "tools-teams",
    title: (
      <>
        Teams and <em>community</em>
      </>
    ),
    line: "Recent fights, published builds, your Team and your own timers.",
    link: { href: "/groups", label: "Your Teams" },
    hrefs: ["/tools/kill-feed", "/builds", "/groups", "/timers"],
  },
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
/** The tool's own painted emblem; tools without one let their card's scene carry them. */
function ToolMark({ tool, size }: { tool: Tool; size: number }) {
  const painting = paintings[tool.href];
  return painting ? (
    // eslint-disable-next-line @next/next/no-img-element -- owner-supplied task emblem
    <img src={`/albion/icons/${painting}.webp`} alt="" width={size} height={size} />
  ) : null;
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
      `${t.title} ${t.description} ${t.state}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
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
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Find a tool</span>
          <input
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
        <span className="directory-count" role="status">
          {matches.length} {matches.length === 1 ? "tool" : "tools"}
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
      ) : (
        !pins.length &&
        !query && (
          <p className="tool-pin-help">
            <Pin size={14} aria-hidden="true" /> Pin up to six shortcuts on this device.
          </p>
        )
      )}
      {pinMessage && (
        <p className="tool-pin-feedback" role="status">
          {pinMessage}
        </p>
      )}
      <div className="directory-groups">
        {sections.map((section) => {
          const rows = section.hrefs
            .map((href) => matches.find((t) => t.href === href))
            .filter((t): t is Tool => !!t);
          return rows.length ? (
            <section
              className="directory-group"
              key={section.id}
              aria-labelledby={`${section.id}-title`}
            >
              <SectionHeading
                id={`${section.id}-title`}
                title={section.title}
                line={
                  <>
                    <span className="directory-chip">
                      {rows.length} {rows.length === 1 ? "tool" : "tools"}
                    </span>
                    {section.line}
                  </>
                }
                link={section.link}
              />
              <div className="directory-entries">
                {rows.map((t) => (
                  <article
                    className="raised has-scene directory-entry"
                    key={t.href}
                    data-scene={scenes[t.href]?.scene ?? "economy"}
                  >
                    <Link
                      className="directory-entry-link"
                      data-emblem={paintings[t.href] ? "" : undefined}
                      href={`${t.href}?region=${region}`}
                    >
                      {paintings[t.href] && (
                        <span className="tool-symbol" aria-hidden="true">
                          <ToolMark tool={t} size={56} />
                        </span>
                      )}
                      <span className="directory-entry-copy">
                        <h3>{t.title}</h3>
                        <p>{t.description}</p>
                        <span className="tool-availability">{t.state}</span>
                      </span>
                      <ArrowUpRight className="directory-arrow" size={18} aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      className="directory-pin"
                      aria-pressed={pins.includes(t.href)}
                      aria-label={`${pins.includes(t.href) ? "Unpin" : "Pin"} ${t.title} on this device`}
                      onClick={() => togglePin(t.href)}
                    >
                      <Pin size={16} aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
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
      <section className="raised has-scene directory-cta" data-scene="city">
        <h2>
          Plan a <em>crafting</em> session
        </h2>
        <p>List what you want to make, tick off what you already own and buy the rest.</p>
        <div className="directory-cta-actions">
          <Link className="button primary" href={`/shopping-list?region=${region}`}>
            Open the Crafting Planner <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className="button secondary" href={`/tools/crafting?region=${region}`}>
            Price a craft
          </Link>
        </div>
        <p className="directory-footnote">
          Recipes and game tables come from game data captured 27 Oct 2026. Prices come from the
          Albion Online Data Project and can be missing; you can always type your own.
        </p>
      </section>
    </div>
  );
}
