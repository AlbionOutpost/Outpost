"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, ArrowUpRight, X } from "lucide-react";
import { tools, toolGroups } from "@/lib/tool-directory";
import { ToolIcon } from "./tool-icon";
import { ItemIcon } from "./item-icon";
import { useAtlasRegion } from "./region-context";
const toolArtwork: Record<string, string[]> = {
  fish: ["T7_FISH_FRESHWATER_FOREST_RARE"],
  market: ["T4_BAG"],
  craft: ["T4_MAIN_AXE"],
  refine: ["T4_METALBAR"],
  enchant: ["T4_RUNE"],
  transport: ["T4_MOUNT_HORSE"],
  equipment: ["T4_ARMOR_LEATHER_SET1"],
  composition: ["T4_MAIN_AXE", "T4_OFF_SHIELD"],
  catalog: ["T4_HEAD_CLOTH_SET1"],
  builds: ["T4_2H_BOW"],
};
export function ToolDirectory() {
  const region = useAtlasRegion();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All tools");
  const matches = tools.filter(
    (t) =>
      (category === "All tools" || t.group === category) &&
      `${t.title} ${t.description} ${t.state}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="directory-page">
      <header className="product-page-heading">
        <div>
          <h1 className="page-title display-title">Tools & calculators</h1>
          <p>Check prices, calculate profit and plan your gear.</p>
        </div>
      </header>
      <div className="directory-start">
        <div className="directory-start-art">
          <ItemIcon id="T4_MAIN_AXE" size={68} />
          <ItemIcon id="T4_BAG" size={56} />
        </div>
        <div>
          <h2>Check the market before you buy</h2>
          <p>Compare city prices, then account for fees and transport.</p>
        </div>
        <Link className="button primary" href={`/tools/market?region=${region}`}>
          Explore markets <ArrowUpRight size={16} />
        </Link>
      </div>
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
                  <Link
                    className="directory-entry"
                    href={`${t.href}?region=${region}`}
                    key={t.href}
                  >
                    <span
                      className={`tool-symbol${toolArtwork[t.icon] ? " tool-game-art" : ""}`}
                      aria-hidden="true"
                    >
                      {toolArtwork[t.icon] ? (
                        <ItemIcon id={toolArtwork[t.icon][0]} size={56} />
                      ) : (
                        <ToolIcon name={t.icon} size={28} />
                      )}
                    </span>
                    <div>
                      <h3>{t.title}</h3>
                      <p>{t.description}</p>
                      <span className="tool-availability">{t.state}</span>
                    </div>
                    <ArrowUpRight className="directory-arrow" size={17} />
                  </Link>
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
