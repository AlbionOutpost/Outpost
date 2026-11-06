"use client";
import "@/app/journal-workspace.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Download } from "lucide-react";
import { parseJournalProgress, type JournalEntry } from "@/lib/journal-progress";
import { regions } from "@/lib/albion/region-config";
import { useOutpostRegion } from "./region-context";
import { ItemIcon } from "./item-icon";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { Disclosure } from "./disclosure";
import { WellSelect } from "./well-select";
import { Unavailable } from "./status-line";
import { SearchInput } from "./field";

const perPage = 25;

/**
 * The journal tracker: a sticky rail with the completed count and one row per category (its own
 * progress beside it), and the objectives as wells, 25 a page. Progress is entered by hand and
 * kept in this browser, per server; nothing is read from the game account.
 */
export function JournalChecklist({ entries }: { entries: JournalEntry[] }) {
  const region = useOutpostRegion();
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
  const tally = useMemo(() => {
    const counts = new Map<string, { done: number; total: number }>();
    for (const e of entries) {
      const c = counts.get(e.category) ?? { done: 0, total: 0 };
      c.total++;
      if (completed.has(e.entryId)) c.done++;
      counts.set(e.category, c);
    }
    return counts;
  }, [entries, completed]);
  const matches = entries.filter(
    (e) =>
      (!category || e.category === category) &&
      (!hideDone || !completed.has(e.entryId)) &&
      `${e.name} ${e.reward} ${e.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(matches.length / perPage));
  const page = Math.min(pageIndex, pages);
  const pick = (value: string) => {
    setCategory(value);
    setPageIndex(1);
  };
  const reset = () => {
    setQuery("");
    setCategory("");
    setHideDone(false);
    setPageIndex(1);
  };
  const share = entries.length ? Math.round((completed.size / entries.length) * 100) : 0;
  const ready = restoredRegion === region;
  return (
    <section className="journal-tracker" aria-label="Journal objectives">
      <aside className="raised journal-rail" aria-label="Journal progress">
        <div className="journal-progress">
          <span className="journal-progress-label">Journal progress</span>
          <strong className="journal-progress-figure">
            {completed.size.toLocaleString("en-US")}
            <span> / {entries.length.toLocaleString("en-US")}</span>
          </strong>
          <span className="journal-meter" aria-hidden="true">
            <span style={{ width: `${share}%` }} />
          </span>
          <span className="journal-progress-note">
            {share}% done on this device · {regions[region].label}
          </span>
        </div>
        <nav className="journal-categories" aria-label="Journal categories">
          {[["", { done: completed.size, total: entries.length }] as const, ...tally].map(
            ([value, count]) => (
              <button
                type="button"
                key={value}
                aria-pressed={category === value}
                onClick={() => pick(value)}
              >
                <span className="journal-category-name">{value || "Every objective"}</span>
                <span className="journal-category-count">
                  {count.done}/{count.total}
                </span>
                <span className="journal-meter" aria-hidden="true">
                  <span
                    style={{ width: `${count.total ? (count.done / count.total) * 100 : 0}%` }}
                  />
                </span>
              </button>
            ),
          )}
        </nav>
        <Disclosure summary="Backup & restore progress">
          <div className="journal-backup">
            <p>
              Progress is ticked by hand for one character on {regions[region].label}, kept in this
              browser. Nothing is read from your game account, and new patch objectives are not
              added for you.
            </p>
            <button
              type="button"
              className="button secondary"
              disabled={!ready}
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
              <Download size={15} aria-hidden="true" /> Export journal progress
            </button>
            <label className="journal-import">
              Import journal progress
              <input
                type="file"
                accept="application/json,.json"
                disabled={!ready}
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
        </Disclosure>
      </aside>
      <div className="raised journal-list">
        <PanelHead
          title={category || "Every objective"}
          line={`${matches.length.toLocaleString("en-US")} ${matches.length === 1 ? "objective" : "objectives"}${pages > 1 ? ` · page ${page} of ${pages}` : ""}`}
        />
        <div className="journal-toolbar">
          <label className="journal-search">
            <span className="sr-only">Search objectives or rewards</span>
            <SearchInput
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
          <label className="journal-category-select">
            <span className="sr-only">Category</span>
            <WellSelect value={category} onChange={(e) => pick(e.target.value)}>
              <option value="">Every objective</option>
              {[...tally.keys()].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </WellSelect>
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
        {message && (
          <p role="status" className="journal-message">
            {message}
          </p>
        )}
        {matches.length ? (
          <div className="journal-objectives" role="list" aria-label="Matching journal objectives">
            {matches.slice((page - 1) * perPage, page * perPage).map((entry) => {
              const done = completed.has(entry.entryId);
              return (
                <div
                  className={`journal-objective${done ? " complete" : ""}`}
                  key={entry.entryId}
                  role="listitem"
                >
                  <label className="journal-objective-label">
                    <input
                      type="checkbox"
                      aria-label={`Complete: ${entry.name}`}
                      disabled={!ready}
                      checked={done}
                      onChange={() =>
                        save(
                          done
                            ? [...completed].filter((id) => id !== entry.entryId)
                            : [...completed, entry.entryId],
                        )
                      }
                    />
                    <span className="journal-check" aria-hidden="true">
                      <Check size={16} strokeWidth={3} />
                    </span>
                    <span className="journal-objective-copy">
                      <strong>{entry.name}</strong>
                      <small>{entry.category}</small>
                    </span>
                  </label>
                  <span className="journal-reward">
                    {/* Every reward sits in the same 36px well; the icon proxy draws the
                        neutral placeholder for anything it cannot render */}
                    <span className="journal-reward-well" aria-hidden="true">
                      {/^[A-Z0-9_]{3,100}(?:@[1-4])?$/.test(entry.rewardId) && (
                        <ItemIcon id={entry.rewardId} size={36} />
                      )}
                    </span>
                    {entry.reward ? (
                      <span>{entry.reward}</span>
                    ) : (
                      <Unavailable label="Reward unavailable" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyWell
            title="No objectives match."
            line="Try another search, show completed objectives, or pick another category."
            action={
              <button type="button" className="button secondary" onClick={reset}>
                Reset journal filters
              </button>
            }
          />
        )}
        {pages > 1 && (
          <nav className="journal-pagination" aria-label="Journal pages">
            <button
              type="button"
              className="pill-link is-small"
              disabled={page === 1}
              onClick={() => setPageIndex(page - 1)}
            >
              <ArrowLeft size={14} aria-hidden="true" /> Previous
            </button>
            <span>
              <span className="sr-only">Page </span>
              {page} / {pages}
            </span>
            <button
              type="button"
              className="pill-link is-small"
              disabled={page === pages}
              onClick={() => setPageIndex(page + 1)}
            >
              Next <ArrowRight size={14} aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}
