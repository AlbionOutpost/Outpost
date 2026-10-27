"use client";
import { useState, type ReactNode } from "react";
import { MobileFilterPanel } from "./mobile-filter-panel";
import { BookOpen } from "lucide-react";
export function GuideDirectory({
  guides,
}: {
  guides: { id: string; title: string; category: string; summary: string; content: ReactNode }[];
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("");
  const matches = guides.filter(
    (g) =>
      (!category || g.category === category) &&
      `${g.title} ${g.summary}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="guide-directory">
      <aside className="build-discovery-filters">
        <label>
          Search guides
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Market, loadouts, parties…"
          />
        </label>
        <MobileFilterPanel label="Filter guides">
          <label>
            Guide category
            <select
              aria-label="Guide category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All topics</option>
              {[...new Set(guides.map((g) => g.category))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <p className="muted">Original workflow notes for Outpost’s tools.</p>
        </MobileFilterPanel>
      </aside>
      <div className="guide-directory-grid">
        {matches.map((g) => (
          <article className="guide-discovery-card" key={g.id} id={g.id}>
            <div className="guide-card-kicker">
              <BookOpen size={18} aria-hidden="true" />
              <span>{g.category}</span>
            </div>
            <h2>{g.title}</h2>
            <p>{g.summary}</p>
            <details>
              <summary>Read guide</summary>
              <div className="guide-body">{g.content}</div>
            </details>
          </article>
        ))}
        {!matches.length && (
          <div className="panel empty">No guide matches this search. Try another topic.</div>
        )}
      </div>
    </div>
  );
}
