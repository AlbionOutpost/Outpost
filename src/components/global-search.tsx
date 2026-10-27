"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X, ArrowUpRight, CornerDownLeft, LoaderCircle } from "lucide-react";
import { ItemIcon } from "./item-icon";
import { ToolIcon } from "./tool-icon";
import { useAtlasRegion } from "./region-context";

type SearchRow = { category: string; title: string; url: string };
const destinations = [
  { title: "Check a price", note: "Compare cities", url: "/tools/market", icon: "market" },
  { title: "Create a build", note: "Gear & abilities", url: "/builds/new", icon: "equipment" },
  { title: "Plan a comp", note: "Roles & loadouts", url: "/compositions/new", icon: "composition" },
  { title: "Calculate profit", note: "Costs & returns", url: "/tools/flipping", icon: "trade" },
] as const;
const categoryName = (category: string) =>
  category === "Compositions" ? "Comps" : category === "Groups" ? "Guilds" : category;
function ResultIcon({ row }: { row: SearchRow }) {
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
  const [opened, setOpened] = useState(false),
    [query, setQuery] = useState("");
  const [result, setResult] = useState<{ key: string; results: SearchRow[] } | null>(null);
  const [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false);
  const open = () => {
    if (!dialog.current?.open) dialog.current?.showModal();
    setOpened(true);
    input.current?.focus();
  };
  const close = () => dialog.current?.close();
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else open();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
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
        onClick={open}
        aria-label="Search Albion… Ctrl K"
        className="button secondary search-trigger"
      >
        <Search size={18} />
        <span className="search-shortcut">
          <span>Search Albion…</span>
          <kbd>Ctrl K</kbd>
        </span>
      </button>
      <dialog
        ref={dialog}
        aria-label="Global search"
        className="search-dialog command-search"
        onClose={() => {
          setOpened(false);
          setQuery("");
          setResult(null);
          setMessage("");
          setLoading(false);
        }}
        onClick={(e) => {
          if (e.target === dialog.current) close();
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
            <span>Search Outpost</span>
            <span className="command-dismiss">
              <kbd>Esc</kbd>
              <button className="command-close" onClick={close} aria-label="Close search">
                <X size={19} />
              </button>
            </span>
          </div>
          <div className="command-input-wrap">
            <Search size={23} aria-hidden="true" />
            <input
              ref={input}
              type="search"
              value={query}
              maxLength={100}
              autoComplete="off"
              spellCheck={false}
              aria-label="Search items, builds, groups and tools"
              placeholder="Items, builds, comps…"
              aria-describedby="global-search-status"
              onChange={(e) => {
                setQuery(e.target.value);
                setLoading(e.target.value.trim().length >= 2);
                setMessage("");
              }}
            />
            {loading && <LoaderCircle className="search-loading" size={20} aria-hidden="true" />}
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
                          <span>{row.title}</span>
                          <ArrowUpRight size={16} />
                        </Link>
                      ))}
                  </section>
                ))}
              </div>
            )}
            <p id="global-search-status" className="command-status" role="status">
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
            <span>Private content stays private</span>
          </div>
        </div>
      </dialog>
    </>
  );
}
