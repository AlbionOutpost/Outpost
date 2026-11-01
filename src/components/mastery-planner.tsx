"use client";
import { useEffect, useState } from "react";
import { ItemIcon } from "./item-icon";
import {
  masteryCategories,
  masteryGroups,
  focusEfficiency,
  focusPerCraft,
} from "@/lib/albion/focus";
import type { MasteryLevels } from "@/lib/albion/focus";
import { readMasteryLevels, writeMasteryLevels } from "@/lib/mastery-storage";
import type { Recipe } from "@/lib/albion/recipes";
import "@/app/tool-workspace.css";
const groups = Object.entries(masteryGroups);
export function MasteryPlanner() {
  const [levels, setLevels] = useState<MasteryLevels>({});
  const [loaded, setLoaded] = useState(false);
  const [group, setGroup] = useState(groups[0][0]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Recipe[]>([]);
  useEffect(() => {
    // Hydrate from this device after mount so server and client markup match.
    queueMicrotask(() => {
      setLevels(readMasteryLevels());
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const active = new AbortController();
    const timer = setTimeout(() => {
      const q = new URLSearchParams({ kind: "crafting", q: query.trim(), limit: "8" });
      Promise.all([
        fetch(`/api/recipes?${q}`, { signal: active.signal }).then((r) => r.json()),
        fetch(
          `/api/recipes?${new URLSearchParams({ kind: "refining", q: query.trim(), limit: "4" })}`,
          {
            signal: active.signal,
          },
        ).then((r) => r.json()),
      ])
        .then(([a, b]: { recipes: Recipe[] }[]) =>
          setFound([...(a.recipes ?? []), ...(b.recipes ?? [])]),
        )
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      active.abort();
    };
  }, [query]);
  function set(id: string, value: number) {
    const next = { ...levels, [id]: Math.max(0, Math.min(100, Math.round(value || 0))) };
    setLevels(next);
    setStatus(
      writeMasteryLevels(next)
        ? "Saved on this device."
        : "This browser could not save your levels.",
    );
  }
  const categories = masteryCategories.filter((c) =>
    masteryGroups[group].categoryIds.includes(c.id),
  );
  const total = (ids: string[]) => ids.reduce((sum, id) => sum + (levels[id] ?? 0), 0);
  return (
    <div className="tool-workspace mastery-workspace">
      <aside className="panel tool-library" aria-label="Destiny board groups">
        <h2>Destiny board</h2>
        <div className="tool-library-list">
          {groups.map(([id, g]) => {
            const specIds = masteryCategories
              .filter((c) => g.categoryIds.includes(c.id))
              .flatMap((c) => c.specs.map((s) => s.id));
            return (
              <button
                key={id}
                type="button"
                aria-pressed={group === id}
                onClick={() => setGroup(id)}
              >
                <span>
                  {g.label}
                  <small>{loaded ? `${total(specIds)} levels` : "—"}</small>
                </span>
              </button>
            );
          })}
        </div>
      </aside>
      <div className="tool-inputs">
        <p role="status" className="muted">
          {status ||
            "Levels are kept in this browser and fill the focus estimate in every crafting calculator."}
        </p>
        {categories.map((category) => (
          <section key={category.id} className="panel" aria-labelledby={`mastery-${category.id}`}>
            <div className="tool-section-heading">
              <span className="tool-item-cell">
                <ItemIcon id={category.itemId} size={40} />
                <h2 id={`mastery-${category.id}`}>{category.name}</h2>
              </span>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  const next = { ...levels };
                  for (const s of category.specs) next[s.id] = 100;
                  setLevels(next);
                  setStatus(writeMasteryLevels(next) ? "Saved on this device." : "Could not save.");
                }}
              >
                Set all to 100
              </button>
            </div>
            <div className="mastery-spec-grid">
              {category.specs.map((spec) => (
                <label key={spec.id}>
                  <ItemIcon id={spec.itemId} size={32} />
                  <span>{spec.name}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    disabled={!loaded}
                    value={levels[spec.id] ?? 0}
                    onChange={(e) => set(spec.id, Number(e.target.value))}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
      <aside className="panel tool-results" aria-labelledby="mastery-check-title">
        <h2 id="mastery-check-title">Focus check</h2>
        <label>
          Recipe
          <input
            type="search"
            placeholder="Search an item, e.g. Battleaxe"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <ul className="mastery-focus-list">
          {query.trim().length >= 2 &&
            found.map((r) => {
              let efficiency = 0,
                perCraft: number | null = null;
              try {
                efficiency = focusEfficiency(r.output, levels);
                perCraft = r.baseFocus ? focusPerCraft(r.baseFocus, efficiency) : null;
              } catch {}
              return (
                <li key={r.id}>
                  <ItemIcon id={r.output} size={32} />
                  <span>
                    {r.name}
                    <small>
                      {r.baseFocus
                        ? `${r.baseFocus.toLocaleString()} base → ${perCraft?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? "—"} focus · efficiency ${efficiency.toLocaleString()}`
                        : "No focus cost"}
                    </small>
                  </span>
                </li>
              );
            })}
        </ul>
        <p className="muted">
          focus = base ÷ 2^(efficiency ÷ 10,000). Each spec adds its per-level efficiency to the
          items it covers; the station rounds the final figure.
        </p>
      </aside>
    </div>
  );
}
