"use client";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag, RefreshCw, Download, Trash2, Check, ArrowRight, Undo2 } from "lucide-react";
import Link from "@/components/link";
import { ShoppingAccountLists } from "./shopping-account-lists";
import { useAtlasRegion } from "./region-context";
import { ItemIcon } from "./item-icon";
import { cities } from "@/lib/albion/region-config";
import {
  shoppingListSchema,
  shoppingSummary,
  mergeShoppingQuotes,
  shoppingKey,
  type ShoppingList,
  type ShoppingEntry,
} from "@/lib/albion/shopping";
import { readShopping, writeShopping } from "./shopping-storage";
import { fetchQuoteBatch } from "@/lib/albion/market-quotes";
import { isStale } from "@/lib/albion/freshness";
const money = (n: number | null) =>
  n === null ? "Prices needed" : n.toLocaleString("en-GB", { maximumFractionDigits: 2 });
export function ShoppingWorkspace() {
  const region = useAtlasRegion();
  const [state, setState] = useState<ShoppingList>({ version: 1, region, entries: [] });
  const [blocked, setBlocked] = useState(false),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [undo, setUndo] = useState<ShoppingList | null>(null);
  const controller = useRef<AbortController | null>(null);
  const checkedPrices = useRef(new Set<string>());
  useEffect(() => {
    function restore() {
      try {
        setState(readShopping(region));
        setBlocked(false);
      } catch {
        setState({ version: 1, region, entries: [] });
        setBlocked(true);
        setMessage(
          "Your saved list could not be opened. Reset it to start a new list, or keep the saved data and try again later.",
        );
      }
      setLoaded(true);
    }
    const frame = requestAnimationFrame(() => {
      setMessage("");
      setUndo(null);
      setBusy(false);
      checkedPrices.current.clear();
      restore();
    });
    window.addEventListener("outpost-shopping-change", restore);
    window.addEventListener("storage", restore);
    return () => {
      cancelAnimationFrame(frame);
      controller.current?.abort();
      window.removeEventListener("outpost-shopping-change", restore);
      window.removeEventListener("storage", restore);
    };
  }, [region]);
  const list = state.region === region ? state : { version: 1 as const, region, entries: [] };
  const result = shoppingSummary(list);
  function commit(next: ShoppingList, preserveUndo = true) {
    if (blocked) return;
    try {
      const parsed = shoppingListSchema.parse(next);
      if (preserveUndo) setUndo(list);
      writeShopping(parsed);
      setState(parsed);
      setMessage("Shopping list saved on this device.");
    } catch {
      setMessage(
        "That change could not be saved. Check quantities and prices; your previous list is kept.",
      );
    }
  }
  function update(key: string, patch: Partial<ShoppingEntry>) {
    commit({
      ...list,
      entries: list.entries.map((row) => (shoppingKey(row) === key ? { ...row, ...patch } : row)),
    });
  }
  async function refresh() {
    const requested = list,
      active = new AbortController();
    controller.current?.abort();
    controller.current = active;
    setBusy(true);
    setMessage("");
    try {
      const candidates = requested.entries
        .filter(
          (r) =>
            r.city !== "Black Market" &&
            r.quantity > r.owned &&
            (r.priceKind !== "manual" || r.unitPrice === null),
        )
        .sort(
          (a, b) =>
            Number(a.unitPrice !== null && !isStale(a.observedAt || "")) -
            Number(b.unitPrice !== null && !isStale(b.observedAt || "")),
        );
      if (candidates.every((row) => checkedPrices.current.has(shoppingKey(row))))
        checkedPrices.current.clear();
      const items = candidates
        .filter((row) => !checkedPrices.current.has(shoppingKey(row)))
        .slice(0, 20);
      if (!items.length) {
        setMessage("No unpriced purchases need refreshing. Manual prices are kept.");
        return;
      }
      const quotes = await fetchQuoteBatch(region, items, active.signal);
      if (active.signal.aborted) return;
      items.forEach((row) => checkedPrices.current.add(shoppingKey(row)));
      const current = readShopping(region);
      const next = mergeShoppingQuotes(current, items, quotes);
      const changed = next.entries.filter((row, i) => row !== current.entries[i]).length;
      if (changed) commit(next);
      setMessage(
        changed
          ? `Updated ${changed} recent city prices. Manual prices were kept. ${items.length === 20 ? "Refresh checks up to 20 purchase lines at a time." : ""}`
          : "No recent matching prices were returned. Enter unit prices or try a different city.",
      );
    } catch {
      if (!active.signal.aborted)
        setMessage("Prices could not be refreshed. Your list and manual prices are kept.");
    } finally {
      if (controller.current === active) setBusy(false);
    }
  }
  return (
    <div className="shopping-workspace">
      <header className="shopping-heading">
        <div>
          <h1 className="page-title display-title">Your next run, ready to buy.</h1>
          <p className="intro">
            Combine loadouts and crafting materials. Count what you own, then buy what you need.
          </p>
          <span className="shopping-save-note">
            Saved on this device · {region.charAt(0).toUpperCase() + region.slice(1)}
          </span>
        </div>
        <Link className="button secondary" href={`/builds/library?region=${region}`}>
          Find a loadout <ArrowRight size={16} />
        </Link>
      </header>
      {blocked ? (
        <div className="panel" role="alert">
          <h2>Your saved list needs attention</h2>
          <p>{message}</p>
          <button
            className="button secondary"
            onClick={() => {
              if (window.confirm("Reset the saved shopping list for this server?")) {
                writeShopping({ version: 1, region, entries: [] });
                setBlocked(false);
                setMessage("A new shopping list is ready.");
              }
            }}
          >
            Reset saved list
          </button>
        </div>
      ) : (
        <>
          <div className="shopping-toolbar">
            <div>
              <strong>{list.entries.length} purchase lines</strong>
              <span>
                {result.ready} ready · {result.remainingItems.toLocaleString()} items to buy
              </span>
            </div>
            <div className="actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy || !list.entries.length}
                onClick={refresh}
              >
                <RefreshCw size={15} />
                {busy ? "Updating prices…" : "Refresh city prices"}
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={!undo}
                onClick={() => {
                  if (undo?.region === region) {
                    commit(undo, false);
                    setUndo(null);
                  }
                }}
              >
                <Undo2 size={15} />
                Undo
              </button>
              <button
                type="button"
                className="button secondary"
                disabled={!list.entries.length}
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(list, null, 2)], { type: "application/json" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `outpost-shopping-${region}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={15} />
                Export list
              </button>
            </div>
          </div>
          {message && (
            <p role="status" className="shopping-message">
              {message}
            </p>
          )}
          {!loaded ? (
            <div className="panel empty">Opening your shopping list…</div>
          ) : !list.entries.length ? (
            <section className="panel shopping-empty">
              <ShoppingBag size={40} />
              <h2>Start with a loadout or a crafting plan.</h2>
              <p>
                Add equipment from a build, or send the materials from your production plan here.
                Quantities combine automatically; owned items stay separate.
              </p>
              <div className="actions">
                <Link href={`/builds/new?region=${region}`} className="button primary">
                  Create a build
                </Link>
                <Link href={`/tools/crafting?region=${region}`} className="button secondary">
                  Plan a craft
                </Link>
              </div>
            </section>
          ) : (
            <div className="shopping-layout">
              <section className="panel shopping-table-panel">
                <div
                  className="table-scroll"
                  role="region"
                  aria-label="Shopping requirements"
                  tabIndex={0}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Equipment / material</th>
                        <th>Need</th>
                        <th>Own</th>
                        <th>Buy</th>
                        <th>Unit price</th>
                        <th>Total</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row) => {
                        const key = shoppingKey(row);
                        return (
                          <tr key={key} className={row.buy === 0 ? "shopping-ready" : ""}>
                            <th scope="row">
                              <div className="shopping-item">
                                <ItemIcon id={row.itemId} quality={row.quality} size={52} />
                                <div>
                                  <strong>{row.name}</strong>
                                  <select
                                    aria-label={`${row.name} purchase city`}
                                    value={row.city}
                                    onChange={(e) =>
                                      update(key, {
                                        city: e.target.value as ShoppingEntry["city"],
                                        ...(row.priceKind !== "manual"
                                          ? { unitPrice: null, observedAt: null }
                                          : {}),
                                      })
                                    }
                                  >
                                    {cities
                                      .filter(
                                        (city) => city !== "Black Market" || row.city === city,
                                      )
                                      .map((city) => (
                                        <option key={city} disabled={city === "Black Market"}>
                                          {city}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            </th>
                            <td data-label="Need">
                              <input
                                aria-label={`${row.name} required quantity`}
                                type="number"
                                min={1}
                                max={1000000}
                                value={row.quantity}
                                onChange={(e) => update(key, { quantity: Number(e.target.value) })}
                              />
                            </td>
                            <td data-label="Own">
                              <input
                                aria-label={`${row.name} owned quantity`}
                                type="number"
                                min={0}
                                max={1000000}
                                value={row.owned}
                                onChange={(e) => update(key, { owned: Number(e.target.value) })}
                              />
                            </td>
                            <td className="numeric" data-label="Buy">
                              {row.buy}
                            </td>
                            <td data-label="Unit price">
                              <input
                                aria-label={`${row.name} unit price`}
                                type="number"
                                min={0}
                                step="any"
                                placeholder="Add price"
                                value={row.unitPrice ?? ""}
                                onChange={(e) =>
                                  update(key, {
                                    unitPrice:
                                      e.target.value === "" ? null : Number(e.target.value),
                                    priceKind: "manual",
                                    observedAt: null,
                                  })
                                }
                              />
                              <small>
                                {row.unavailableMarket
                                  ? "Choose a player purchase market"
                                  : row.stale
                                    ? "Stale · refresh needed"
                                    : row.unitPrice === null
                                      ? "Not priced"
                                      : row.priceKind === "manual"
                                        ? "Manual price"
                                        : row.priceKind === "plan"
                                          ? "Plan estimate"
                                          : `Observed ${row.observedAt} UTC`}
                              </small>
                            </td>
                            <td className="numeric" data-label="Total">
                              {row.cost === null ? "—" : money(row.cost)}
                            </td>
                            <td className="shopping-actions-cell">
                              <div className="shopping-row-actions">
                                <button
                                  type="button"
                                  className="button secondary"
                                  aria-label={`Mark ${row.name} ${row.buy === 0 ? "needed" : "owned"}`}
                                  onClick={() =>
                                    update(key, { owned: row.buy === 0 ? 0 : row.quantity })
                                  }
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  type="button"
                                  className="button secondary"
                                  aria-label={`Remove ${row.name}`}
                                  onClick={() =>
                                    commit({
                                      ...list,
                                      entries: list.entries.filter(
                                        (item) => shoppingKey(item) !== key,
                                      ),
                                    })
                                  }
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              <aside className="panel shopping-summary">
                <ShoppingBag size={26} />
                <h2>Purchase summary</h2>
                <span>Item purchase estimate</span>
                <strong className="shopping-total">
                  {result.total === null ? "Incomplete" : money(result.total)}
                </strong>
                <small>silver · after owned inventory</small>
                <dl>
                  <div>
                    <dt>Priced purchases</dt>
                    <dd>{money(result.knownCost)}</dd>
                  </div>
                  <div>
                    <dt>Prices still needed</dt>
                    <dd>{result.missing}</dd>
                  </div>
                  <div>
                    <dt>Ready lines</dt>
                    <dd>
                      {result.ready} / {list.entries.length}
                    </dd>
                  </div>
                </dl>
                <p>
                  Item prices are recent observations or your own inputs. Order fees and transport
                  are separate. Check listings before buying. Crafting returns are not treated as
                  inventory you already own.
                </p>
              </aside>
            </div>
          )}
        </>
      )}
      {!blocked && loaded && <ShoppingAccountLists list={list} onLoad={(saved) => commit(saved)} />}
    </div>
  );
}
