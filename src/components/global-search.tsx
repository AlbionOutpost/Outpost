"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/link";
import { Search, X, ArrowUpRight, CornerDownLeft, LoaderCircle } from "lucide-react";
import { ItemIcon } from "./item-icon";
import { ToolIcon } from "./tool-icon";
import { useAtlasRegion } from "./region-context";

type SearchRow = { category: string; title: string; url: string; subtitle?: string; icon?: string };
const destinations = [
  { title: "Check a price", note: "Compare cities", url: "/tools/market", icon: "market" },
  { title: "Create a build", note: "Gear & abilities", url: "/builds/new", icon: "equipment" },
  { title: "Plan a comp", note: "Roles & loadouts", url: "/compositions/new", icon: "composition" },
  { title: "Calculate profit", note: "Costs & returns", url: "/tools/flipping", icon: "trade" },
] as const;
const categoryName = (category: string) =>
  category === "Compositions" ? "Comps" : category === "Groups" ? "Teams" : category;
function ResultIcon({ row }: { row: SearchRow }) {
  if (row.icon) return <ItemIcon id={row.icon} size={42} />;
  if (row.category === "Items") {
    const id = decodeURIComponent(row.url.split("/").at(-1) || "");
    return <ItemIcon id={id} size={42} />;
  }
  return (
    <ToolIcon
      name={
        row.category === "Builds"
          ? "equipment"
          : row.category === "Compositions"
            ? "composition"
            : row.category === "Groups"
              ? "guild"
              : "catalog"
      }
      size={24}
    />
  );
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
          setResult({ key: query, results: b.results });
          setMessage(
            b.results.length
              ? `${b.results.length} results`
              : "No matches. Try an item, weapon or tool name.",
          );
          setLoading(false);
        })
        .catch((e) => {
          if (controller.signal.aborted) return;
          setResult(null);
          setMessage(e instanceof Error ? e.message : "Search unavailable. Try again.");
          setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, opened]);
  const rows = query.trim().length >= 2 && result?.key === query ? result.results : [];
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
            {loading && <LoaderCircle className="search-loading" size={20} aria-hidden="true" />}
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
                        <ToolIcon name={d.icon} size={24} />
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
              <div className="command-results" aria-busy={loading}>
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
