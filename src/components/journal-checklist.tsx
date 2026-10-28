"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Search } from "lucide-react";
import { parseJournalProgress, type JournalEntry } from "@/lib/journal-progress";
import { useAtlasRegion } from "./region-context";
import { ItemIcon } from "./item-icon";

export function JournalChecklist({ entries }: { entries: JournalEntry[] }) {
  const region = useAtlasRegion();
  const activeRegion = useRef(region);
  const [restoredRegion, setRestoredRegion] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ region: string; completed: string[] }>({
    region,
    completed: [],
  });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [message, setMessage] = useState("");
  const allowed = useMemo(() => new Set(entries.map((e) => e.entryId)), [entries]);
  const completed = useMemo(
    () => new Set(progress.region === region ? progress.completed : []),
    [progress, region],
  );
  const storageKey = `outpost-journal-v1:${region}`;
  useEffect(() => {
    activeRegion.current = region;
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        setProgress({
          region,
          completed: saved ? parseJournalProgress(saved, region, allowed) : [],
        });
        setMessage(saved ? "Your progress was restored from this device." : "");
      } catch {
        setProgress({ region, completed: [] });
        setMessage(
          "Saved progress could not be read. Your existing backup was kept; import a valid file to recover it.",
        );
      } finally {
        setRestoredRegion(region);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [region, storageKey, allowed]);
  function save(ids: string[]) {
    setProgress({ region, completed: ids });
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, region, completed: ids }));
      setMessage("Progress saved on this device.");
    } catch {
      setMessage(
        "Progress is visible but could not be saved on this device. Export a backup to keep it.",
      );
    }
  }
  const categories = [...new Set(entries.map((e) => e.category))];
  const matches = entries.filter(
    (e) =>
      (!category || e.category === category) &&
      (!hideDone || !completed.has(e.entryId)) &&
      `${e.name} ${e.reward} ${e.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(matches.length / 25));
  const page = Math.min(pageIndex, pages);
  return (
    <section className="journal-checklist" aria-label="Recovered journal objectives">
      <div className="journal-introduction">
        <div>
          <h2>Your next little adventure.</h2>
          <p>
            {entries.length.toLocaleString()} captured objectives. Find something to work toward,
            and tick it off when you’re done.
          </p>
        </div>
        <div className="journal-progress-count">
          <strong>
            {completed.size}
            <span> / {entries.length.toLocaleString()}</span>
          </strong>
          <small>Completed on this device · {region}</small>
        </div>
      </div>
      <div className="journal-toolbar">
        <label>
          <span>
            <Search size={14} /> Search objectives or rewards
          </span>
          <input
            type="search"
            value={query}
            maxLength={100}
            placeholder="Dungeon, gathering, tome, silver…"
            onChange={(e) => {
              setQuery(e.target.value);
              setPageIndex(1);
            }}
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPageIndex(1);
            }}
          >
            <option value="">Every adventure</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="journal-hide-completed">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => {
              setHideDone(e.target.checked);
              setPageIndex(1);
            }}
          />
          Hide completed
        </label>
      </div>
      <div className="journal-objectives" role="list" aria-label="Matching journal objectives">
        {matches.slice((page - 1) * 25, page * 25).map((entry) => (
          <div
            className={`journal-objective${completed.has(entry.entryId) ? " complete" : ""}`}
            key={entry.entryId}
            role="listitem"
          >
            <label className="journal-completion-control">
              <input
                type="checkbox"
                aria-label={`Complete: ${entry.name}`}
                disabled={restoredRegion !== region}
                checked={completed.has(entry.entryId)}
                onChange={() =>
                  save(
                    completed.has(entry.entryId)
                      ? [...completed].filter((id) => id !== entry.entryId)
                      : [...completed, entry.entryId],
                  )
                }
              />
            </label>
            <div>
              <strong>{entry.name}</strong>
              <small>{entry.category}</small>
            </div>
            <div className="journal-reward">
              {/^T[1-8]_[A-Z0-9_]+$/.test(entry.rewardId) && (
                <ItemIcon id={entry.rewardId} size={36} />
              )}
              <span>{entry.reward || "Reward not captured"}</span>
            </div>
          </div>
        ))}
      </div>
      {!matches.length && (
        <div className="journal-empty">
          <h3>No objectives match.</h3>
          <p>Try another search, show completed entries, or choose a different category.</p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setQuery("");
              setCategory("");
              setHideDone(false);
              setPageIndex(1);
            }}
          >
            Reset journal filters
          </button>
        </div>
      )}
      <nav className="journal-pagination" aria-label="Journal pages">
        <button
          type="button"
          className="button secondary"
          disabled={page === 1}
          onClick={() => setPageIndex(page - 1)}
        >
          Previous objectives
        </button>
        <span>
          {matches.length.toLocaleString()} objectives · {page} / {pages}
        </span>
        <button
          type="button"
          className="button secondary"
          disabled={page === pages}
          onClick={() => setPageIndex(page + 1)}
        >
          Next objectives
        </button>
      </nav>
      <details className="journal-backup">
        <summary>Backup & restore progress</summary>
        <p>
          Manual progress for one character in the selected region, kept in this browser. No account
          or game progress is imported.
        </p>
        <div>
          <button
            type="button"
            className="button secondary"
            disabled={restoredRegion !== region}
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob(
                  [JSON.stringify({ version: 1, region, completed: [...completed] }, null, 2)],
                  { type: "application/json" },
                ),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = `outpost-journal-${region}.json`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            <Download size={14} /> Export journal progress
          </button>
          <label>
            Import journal progress
            <input
              type="file"
              accept="application/json,.json"
              disabled={restoredRegion !== region}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                try {
                  if (file.size > 512000) throw Error("Choose a progress backup under 512KB.");
                  const text = await file.text();
                  if (activeRegion.current !== region) return;
                  const ids = parseJournalProgress(text, region, allowed);
                  if (
                    completed.size &&
                    !window.confirm(
                      "Replace progress for this region with this backup? Export your current progress first to keep it.",
                    )
                  )
                    return;
                  save(ids);
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "This progress backup could not be read. Existing progress was kept.",
                  );
                }
              }}
            />
          </label>
        </div>
      </details>
      {message && (
        <p role="status" className="journal-message">
          {message}
        </p>
      )}
    </section>
  );
}
