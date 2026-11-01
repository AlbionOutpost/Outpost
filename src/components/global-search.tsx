"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/link";
import { Search, X, ArrowUpRight, CornerDownLeft } from "lucide-react";
import { ItemIcon } from "./item-icon";
import { useAtlasRegion } from "./region-context";
import { tools } from "@/lib/tool-directory";
import { matchScore } from "@/lib/search-rank";
import { kindEmblem, toolEmblem } from "@/lib/search-emblems";

type SearchRow = {
  category: string;
  title: string;
  url: string;
  subtitle?: string;
  icon?: string;
  emblem?: string;
  image?: string;
};
const destinations = [
  { title: "Check a price", note: "Compare cities", url: "/tools/market", emblem: "tool-market" },
  { title: "Create a build", note: "Gear & spells", url: "/builds/new", emblem: "strip-builds" },
  { title: "Plan a comp", note: "Roles & sets", url: "/compositions/new", emblem: "strip-comps" },
  {
    title: "Craft for profit",
    note: "Costs & returns",
    url: "/tools/crafting",
    emblem: "tool-craft",
  },
] as const;
const categoryName = (category: string) =>
  category === "Compositions" ? "Comps" : category === "Groups" ? "Teams" : category;
function ResultIcon({ row }: { row: SearchRow }) {
  if (row.icon) return <ItemIcon id={row.icon} size={42} />;
  if (row.category === "Items") {
    const id = decodeURIComponent(row.url.split("/").at(-1) || "");
    return <ItemIcon id={id} size={42} />;
  }
  if (row.image)
    // Guide covers are our own library media
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="command-result-cover" src={row.image} alt="" loading="lazy" />;
  const emblem = row.emblem ?? kindEmblem[row.category as keyof typeof kindEmblem] ?? "tool-craft";
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/albion/icons/${emblem}.webp`} alt="" width={40} height={40} />;
}
/** Tools answer instantly from the bundled directory while the full search runs. */
function localTools(query: string): SearchRow[] {
  const q = query.trim();
  return tools
    .map((t) => ({
      t,
      score: Math.max(
        matchScore(t.title, q),
        matchScore(t.short, q),
        matchScore(t.description, q) / 3,
      ),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ t }) => ({
      category: "Tools",
      title: t.title,
      subtitle: t.description,
      url: t.href,
      emblem: toolEmblem(t.icon),
    }));
}
export function GlobalSearch() {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const region = useAtlasRegion();
  const [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(false),
    [query, setQuery] = useState("");
  const [result, setResult] = useState<{ key: string; results: SearchRow[] } | null>(null);
  const [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false);
  // Answers already fetched this visit: going back to a query is instant.
  const answers = useRef(new Map<string, SearchRow[]>());
  const resetSearch = useCallback(() => {
    setQuery("");
    setResult(null);
    setMessage("");
    setLoading(false);
  }, []);
  const open = useCallback(() => {
    resetSearch();
    if (!dialog.current?.open) dialog.current?.showModal();
    setOpened(true);
    input.current?.focus();
  }, [resetSearch]);
  const close = useCallback(() => {
    setOpened(false);
    resetSearch();
    dialog.current?.close();
  }, [resetSearch]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current?.open) close();
        else open();
      }
    };
    window.addEventListener("keydown", key);
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", key);
    };
  }, [open, close]);
  useEffect(() => {
    if (!opened || query.trim().length < 2) return;
    const known = answers.current.get(query.trim().toLowerCase());
    if (known) {
      setResult({ key: query, results: known });
      setMessage(
        known.length ? `${known.length} results` : "Nothing found. Try an item, weapon or tool.",
      );
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then(async (r) => {
          const b = await r.json();
          if (!r.ok) throw new Error(b.error || "Search unavailable. Try again.");
          return b;
        })
        .then((b) => {
          if (controller.signal.aborted) return;
          answers.current.set(query.trim().toLowerCase(), b.results);
          setResult({ key: query, results: b.results });
          setMessage(
            b.results.length
              ? `${b.results.length} results`
              : "Nothing found. Try an item, weapon or tool.",
          );
          setLoading(false);
        })
        .catch((e) => {
          if (controller.signal.aborted) return;
          setResult(null);
          setMessage(e instanceof Error ? e.message : "Search unavailable. Try again.");
          setLoading(false);
        });
    }, 120);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, opened]);
  const searching = query.trim().length >= 2;
  const settled = searching && result?.key === query;
  // Until the full answer lands, tool matches show straight away with placeholders under them.
  const rows = !searching ? [] : settled ? result.results : localTools(query);
  const categories = [...new Set(rows.map((r) => r.category))];
  const href = (url: string) => `${url}?region=${region}`;
  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Search items, builds, guides… Ctrl K"
        className="button secondary search-trigger"
        disabled={!ready}
      >
        <Search size={18} />
        <span className="search-shortcut">
          <span>Search items, builds, guides…</span>
          <kbd>Ctrl K</kbd>
        </span>
      </button>
      <dialog
        ref={dialog}
        aria-label="Global search"
        className="search-dialog command-search"
        onClose={() => {
          // A native close event can arrive after a rapid keyboard reopen.
          if (dialog.current?.open) return;
          setOpened(false);
          resetSearch();
        }}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          const bounds = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < bounds.left ||
            e.clientX > bounds.right ||
            e.clientY < bounds.top ||
            e.clientY > bounds.bottom
          )
            close();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            close();
            return;
          }
          if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
          const links = Array.from(
            dialog.current?.querySelectorAll<HTMLAnchorElement>("a[data-search-result]") ?? [],
          );
          if (!links.length) return;
          e.preventDefault();
          const index = links.findIndex((a) => a === document.activeElement);
          links[
            e.key === "ArrowDown"
              ? (index + 1) % links.length
              : index <= 0
                ? links.length - 1
                : index - 1
          ].focus();
        }}
      >
        <div className="command-search-inner">
          <div className="command-heading">
            <h2>Search Outpost</h2>
            <span className="command-dismiss">
              <kbd>Esc</kbd>
              <button
                type="button"
                className="command-close"
                onClick={close}
                aria-label="Close search"
              >
                <X size={19} />
              </button>
            </span>
          </div>
          <div className="command-input-wrap">
            <Search size={20} aria-hidden="true" />
            <input
              ref={input}
              type="search"
              value={query}
              maxLength={100}
              autoComplete="off"
              spellCheck={false}
              aria-label="Search items, builds, comps, guides, Teams and tools"
              placeholder="Items, builds, comps…"
              aria-describedby="global-search-status"
              onChange={(e) => {
                setQuery(e.target.value);
                setLoading(e.target.value.trim().length >= 2);
                setMessage("");
              }}
            />
            {loading && <span className="search-loading" aria-hidden="true" />}
            {query && (
              <button
                type="button"
                className="command-clear"
                aria-label="Clear search"
                onClick={() => {
                  resetSearch();
                  input.current?.focus();
                }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="command-body">
            {query.trim().length < 2 ? (
              <>
                <p className="command-section-label">Where do you want to go?</p>
                <div className="command-shortcuts">
                  {destinations.map((d) => (
                    <Link key={d.url} data-search-result href={href(d.url)} onClick={close}>
                      <span className="command-destination-icon">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/albion/icons/${d.emblem}.webp`} alt="" width={40} height={40} />
                      </span>
                      <span>
                        <strong>{d.title}</strong>
                        <small>{d.note}</small>
                      </span>
                      <ArrowUpRight size={15} />
                    </Link>
                  ))}
                </div>
                <div className="command-examples">
                  <span>Try an item</span>
                  {["Battleaxe", "Bag", "Mercenary"].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setQuery(q);
                        setLoading(true);
                        input.current?.focus();
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="command-results" aria-busy={loading} key={settled ? query : "local"}>
                {categories.map((category) => (
                  <section key={category} aria-label={`${categoryName(category)} results`}>
                    <h3>{categoryName(category)}</h3>
                    {rows
                      .filter((r) => r.category === category)
                      .map((row, i) => (
                        <Link
                          key={`${row.url}-${i}`}
                          data-search-result
                          className="command-result"
                          style={{ "--i": rows.indexOf(row) } as React.CSSProperties}
                          href={href(row.url)}
                          onClick={close}
                          aria-label={`${categoryName(category)} ${row.title}`}
                        >
                          <span className="command-result-icon">
                            <ResultIcon row={row} />
                          </span>
                          <span className="command-result-text">
                            <span>{row.title}</span>
                            {row.subtitle && <small>{row.subtitle}</small>}
                          </span>
                          <ArrowUpRight size={16} />
                        </Link>
                      ))}
                  </section>
                ))}
                {!settled && loading ? (
                  <div className="command-skeleton" aria-hidden="true">
                    {[0, 1, 2].map((n) => (
                      <span key={n} style={{ "--i": n } as React.CSSProperties}>
                        <i />
                        <b />
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
            <p
              id="global-search-status"
              className={`command-status${query ? "" : " sr-only"}`}
              role="status"
            >
              {query.trim().length < 2
                ? query
                  ? "Add one more character to search."
                  : "Find items, builds, comps and guilds."
                : loading
                  ? "Searching…"
                  : message}
            </p>
          </div>
          <div className="command-footer">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd> Navigate{" "}
              <kbd>
                <CornerDownLeft size={12} />
              </kbd>{" "}
              Open
            </span>
            <span>Items · Tools · Builds · Comps · Guides · Teams</span>
          </div>
        </div>
      </dialog>
    </>
  );
}
