"use client";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { useEffect, useRef, useState } from "react";
import { RefreshCw, Download, Trash2, Check, Undo2, Minus, Plus } from "lucide-react";
import { ShoppingAccountLists } from "./shopping-account-lists";
import { CatalogItemPicker, type CatalogOption } from "./catalog-item-picker";
import { Field } from "./field";
import { useOutpostRegion } from "./region-context";
import { ItemIcon } from "./item-icon";
import { PanelHead } from "./panel-head";
import { StatusLine, Unavailable } from "./status-line";
import { EmptyWell } from "./empty-well";
import { WellSelect } from "./well-select";
import { Silver } from "./silver";
import { cities } from "@/lib/albion/region-config";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { landingShowcase } from "@/lib/landing-showcase";
import {
  shoppingListSchema,
  shoppingSummary,
  mergeShoppingQuotes,
  mergeShopping,
  shoppingKey,
  type ShoppingList,
  type ShoppingEntry,
} from "@/lib/albion/shopping";
import { readShopping, writeShopping } from "./shopping-storage";
import { fetchQuoteBatch, type MarketPrice } from "@/lib/albion/market-quotes";
import { isStale } from "@/lib/albion/freshness";
import styles from "./shopping-workspace.module.css";
import { NumberField } from "./number-field";

const money = (n: number | null) =>
  n === null ? "Prices needed" : n.toLocaleString("en-GB", { maximumFractionDigits: 2 });
const royal = ["Martlock", "Bridgewatch", "Lymhurst", "Fort Sterling", "Thetford", "Caerleon"];
/** The landing's example plan, as purchase lines with no prices yet. */
const examplePlan = (): ShoppingEntry[] =>
  landingShowcase.plan.map((line) => ({
    itemId: line.itemId,
    name: equipmentName(line.itemId).replace(/ · T(\d)\.\d$/, " (T$1)"),
    city: "Lymhurst",
    quality: 1,
    quantity: line.qty,
    owned: 0,
    unitPrice: null,
    priceKind: "manual",
    observedAt: null,
  }));

export function ShoppingWorkspace() {
  const region = useOutpostRegion();
  const [state, setState] = useState<ShoppingList>({ version: 1, region, entries: [] });
  const [blocked, setBlocked] = useState(false),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [undo, setUndo] = useState<ShoppingList | null>(null);
  const [tab, setTab] = useState<"buy" | "queue">("queue");
  const [add, setAdd] = useState<{ quantity: string; city: ShoppingEntry["city"]; picks: number }>({
    quantity: "1",
    city: "Lymhurst",
    picks: 0,
  });
  const [compare, setCompare] = useState<{
    state: "idle" | "loading" | "ready" | "error";
    quotes: { itemId: string; quality: number; prices: MarketPrice[] }[];
  }>({ state: "idle", quotes: [] });
  const controller = useRef<AbortController | null>(null);
  const comparison = useRef<AbortController | null>(null);
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
      setCompare({ state: "idle", quotes: [] });
      checkedPrices.current.clear();
      restore();
    });
    window.addEventListener("outpost-shopping-change", restore);
    window.addEventListener("storage", restore);
    return () => {
      cancelAnimationFrame(frame);
      controller.current?.abort();
      comparison.current?.abort();
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
  /** Picking an item in the add row puts it on the list at once; the same item and city add up. */
  function addItem(item: CatalogOption) {
    const quantity = Math.min(1000000, Math.max(1, Math.round(Number(add.quantity) || 1)));
    const name = `${item.name.replace(/ · \.\d$/, "")} · T${item.tier}.${item.enchantment}`;
    try {
      commit(
        mergeShopping(
          list,
          [
            {
              itemId: item.id,
              name,
              city: add.city,
              quality: 1,
              quantity,
              owned: 0,
              unitPrice: null,
              priceKind: "manual",
              observedAt: null,
            },
          ],
          region,
        ),
      );
      setMessage(`Added ${quantity} × ${name} to buy in ${add.city}.`);
    } catch {
      setMessage("That item could not be added. Your list is kept as it was.");
    }
    setAdd((current) => ({ ...current, quantity: "1", picks: current.picks + 1 }));
    requestAnimationFrame(() =>
      document.querySelector<HTMLInputElement>("#shopping-add input[role=combobox]")?.focus(),
    );
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
  /** Sell orders in every royal city for what is still to buy; nothing is written to the list. */
  async function compareCities() {
    const items = result.rows.filter((row) => row.buy > 0).slice(0, 100);
    if (!items.length) return;
    const active = new AbortController();
    comparison.current?.abort();
    comparison.current = active;
    setCompare({ state: "loading", quotes: [] });
    try {
      const quotes = await fetchQuoteBatch(region, items, active.signal);
      if (!active.signal.aborted)
        setCompare({
          state: quotes.every((q) => q.error) ? "error" : "ready",
          quotes,
        });
    } catch {
      if (!active.signal.aborted) setCompare({ state: "error", quotes: [] });
    }
  }
  const toBuy = result.rows.filter((row) => row.buy > 0);
  const byCity =
    compare.state === "ready"
      ? royal
          .map((city) => {
            let total = 0,
              missing = 0;
            for (const row of toBuy) {
              const quote = compare.quotes
                .find((q) => q.itemId === row.itemId && q.quality === row.quality)
                ?.prices.find(
                  (p) => p.city === city && p.sell_price_min > 0 && !isStale(p.sell_price_min_date),
                );
              if (quote) total += quote.sell_price_min * row.buy;
              else missing++;
            }
            return { city, total, missing };
          })
          .filter((c) => c.missing < toBuy.length)
          .toSorted((a, b) => a.missing - b.missing || a.total - b.total)
          .slice(0, 4)
      : [];
  const top = Math.max(...byCity.map((c) => c.total), 1);
  const totalQuantity = result.rows.reduce((sum, row) => sum + row.quantity, 0);
  const ownedQuantity = result.rows.reduce(
    (sum, row) => sum + Math.min(row.owned, row.quantity),
    0,
  );
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        compact
        glyph="catalog"
        scene="market"
        title="Crafting Planner"
        accent="Planner"
        description={`Add what you need, tick off what you own and see what the rest costs. Kept on this device for ${region.charAt(0).toUpperCase() + region.slice(1)}.`}
      />
      {blocked ? (
        <section className={`panel ${styles.gate}`} role="alert">
          <h2>Your saved list needs attention</h2>
          <p>{message}</p>
          <button
            type="button"
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
        </section>
      ) : !loaded ? (
        <section className={`panel ${styles.gate}`}>
          <StatusLine>Opening your shopping list…</StatusLine>
        </section>
      ) : (
        <div className={styles.layout}>
          <section className={`panel ${styles.main}`} aria-labelledby="shopping-title">
            <div className={styles.mainHead}>
              <PanelHead
                id="shopping-title"
                title={
                  list.entries.length
                    ? `${list.entries.length} purchase ${list.entries.length === 1 ? "line" : "lines"}`
                    : "Your list"
                }
                line={
                  list.entries.length
                    ? `${result.ready} ready · ${result.remainingItems.toLocaleString()} items to buy`
                    : "Search an item to add it. The same item in the same city adds up."
                }
              />
              {list.entries.length > 0 && (
                <div className={styles.tabs} role="tablist" aria-label="Planner view">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "queue"}
                    aria-controls="shopping-view"
                    onClick={() => setTab("queue")}
                  >
                    Crafting queue ({list.entries.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === "buy"}
                    aria-controls="shopping-view"
                    onClick={() => setTab("buy")}
                  >
                    Shopping list
                  </button>
                </div>
              )}
            </div>
            <div id="shopping-add" className={styles.add}>
              <div className={styles.addSearch}>
                <CatalogItemPicker key={add.picks} label="Add an item" onSelect={addItem} />
              </div>
              <Field label="Quantity">
                <NumberField
                  min={1}
                  max={1000000}
                  value={add.quantity}
                  onValueChange={(v) => setAdd({ ...add, quantity: v == null ? "" : String(v) })}
                />
              </Field>
              <Field label="Buy in">
                <WellSelect
                  value={add.city}
                  onChange={(e) =>
                    setAdd({ ...add, city: e.target.value as ShoppingEntry["city"] })
                  }
                >
                  {cities
                    .filter((city) => city !== "Black Market")
                    .map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                </WellSelect>
              </Field>
            </div>
            {list.entries.length ? (
              <>
                <div id="shopping-view" role="tabpanel" aria-labelledby="shopping-title">
                  {tab === "buy" ? (
                    <div
                      className={`table-scroll ${styles.tableScroll}`}
                      role="region"
                      aria-label="Shopping requirements"
                      tabIndex={0}
                    >
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th scope="col">Item and city</th>
                            <th scope="col">Need</th>
                            <th scope="col">Own</th>
                            <th scope="col">Buy</th>
                            <th scope="col">Unit price</th>
                            <th scope="col">Total</th>
                            <th scope="col">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row) => {
                            const key = shoppingKey(row);
                            return (
                              <tr key={key} data-ready={row.buy === 0 ? "" : undefined}>
                                <th scope="row">
                                  <div className={styles.item}>
                                    <ItemIcon id={row.itemId} quality={row.quality} size={44} />
                                    <div>
                                      <strong>{row.name}</strong>
                                      <WellSelect
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
                                      </WellSelect>
                                    </div>
                                  </div>
                                </th>
                                <td data-label="Need">
                                  <NumberField
                                    aria-label={`${row.name} required quantity`}
                                    min={1}
                                    max={1000000}
                                    value={row.quantity}
                                    onValueChange={(v) => update(key, { quantity: v ?? NaN })}
                                  />
                                </td>
                                <td data-label="Own">
                                  <NumberField
                                    aria-label={`${row.name} owned quantity`}
                                    min={0}
                                    max={1000000}
                                    value={row.owned}
                                    onValueChange={(v) => update(key, { owned: v ?? NaN })}
                                  />
                                </td>
                                <td className={styles.num} data-label="Buy">
                                  {row.buy}
                                </td>
                                <td data-label="Unit price">
                                  <NumberField
                                    silver
                                    aria-label={`${row.name} unit price`}
                                    min={0}
                                    decimals={2}
                                    placeholder="Add price"
                                    value={row.unitPrice ?? ""}
                                    onValueChange={(v) =>
                                      update(key, {
                                        unitPrice: v,
                                        priceKind: "manual",
                                        observedAt: null,
                                      })
                                    }
                                  />
                                  <small
                                    data-tone={
                                      row.stale || row.unavailableMarket ? "stale" : undefined
                                    }
                                  >
                                    {row.unavailableMarket
                                      ? "Choose a player market"
                                      : row.stale
                                        ? "Stale · refresh"
                                        : row.unitPrice === null
                                          ? "Not priced"
                                          : row.priceKind === "manual"
                                            ? "Your price"
                                            : row.priceKind === "plan"
                                              ? "Plan estimate"
                                              : `Observed ${row.observedAt} UTC`}
                                  </small>
                                </td>
                                <td className={styles.num} data-label="Total">
                                  {row.cost === null ? (
                                    <Unavailable />
                                  ) : (
                                    <Silver value={row.cost} digits={2} animate={false} />
                                  )}
                                </td>
                                <td className={styles.rowActions}>
                                  <button
                                    type="button"
                                    className={styles.iconButton}
                                    aria-pressed={row.buy === 0}
                                    aria-label={`Mark ${row.name} ${row.buy === 0 ? "needed" : "owned"}`}
                                    onClick={() =>
                                      update(key, { owned: row.buy === 0 ? 0 : row.quantity })
                                    }
                                  >
                                    <Check size={16} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.iconButton}
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
                                    <Trash2 size={16} aria-hidden="true" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <ul className={styles.queue} aria-label="Crafting queue">
                      {result.rows.map((row) => {
                        const key = shoppingKey(row);
                        const owned = Math.min(row.owned, row.quantity);
                        const pct = Math.round((owned / row.quantity) * 100);
                        return (
                          <li key={key} data-ready={row.buy === 0 ? "" : undefined}>
                            <ItemIcon id={row.itemId} quality={row.quality} size={44} />
                            <span className={styles.queueName}>
                              <strong>{row.name}</strong>
                              <span className={styles.progress} aria-hidden="true">
                                <b style={{ width: `${pct}%` }} />
                              </span>
                              <small>
                                {owned} / {row.quantity} owned · {pct}% · {row.city}
                              </small>
                            </span>
                            <span className={styles.queueActions}>
                              <span
                                className={styles.stepper}
                                role="group"
                                aria-label={`Owned ${row.name}`}
                              >
                                <button
                                  type="button"
                                  aria-label={`Own one fewer ${row.name}`}
                                  disabled={!row.owned}
                                  onClick={() => update(key, { owned: row.owned - 1 })}
                                >
                                  <Minus size={14} aria-hidden="true" />
                                </button>
                                <NumberField
                                  aria-label={`${row.name} owned quantity`}
                                  min={0}
                                  max={1000000}
                                  value={row.owned}
                                  onValueChange={(v) => update(key, { owned: v ?? NaN })}
                                />
                                <button
                                  type="button"
                                  aria-label={`Own one more ${row.name}`}
                                  disabled={row.owned >= row.quantity}
                                  onClick={() => update(key, { owned: row.owned + 1 })}
                                >
                                  <Plus size={14} aria-hidden="true" />
                                </button>
                              </span>
                              <button
                                type="button"
                                className={styles.iconButton}
                                aria-pressed={row.buy === 0}
                                aria-label={`Mark ${row.name} ${row.buy === 0 ? "needed" : "owned"}`}
                                onClick={() =>
                                  update(key, { owned: row.buy === 0 ? 0 : row.quantity })
                                }
                              >
                                <Check size={16} aria-hidden="true" />
                              </button>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className={styles.toolbar}>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy}
                    onClick={refresh}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
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
                    <Undo2 size={15} aria-hidden="true" />
                    Undo
                  </button>
                  <button
                    type="button"
                    className="button secondary"
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
                    <Download size={15} aria-hidden="true" />
                    Export list
                  </button>
                </div>
                <div className={styles.cities}>
                  <div className={styles.citiesHead}>
                    <span>Cheapest city to buy the rest</span>
                    {toBuy.length > 0 && (
                      <button
                        type="button"
                        className="pill-link is-small"
                        disabled={compare.state === "loading"}
                        onClick={compareCities}
                      >
                        {compare.state === "ready" ? "Check again" : "Compare cities"}
                      </button>
                    )}
                  </div>
                  {toBuy.length === 0 ? (
                    <StatusLine>Nothing left to buy.</StatusLine>
                  ) : compare.state === "loading" ? (
                    <StatusLine>Checking the royal cities…</StatusLine>
                  ) : compare.state === "error" ? (
                    <StatusLine tone="error">
                      City prices could not be loaded. Try again shortly.
                    </StatusLine>
                  ) : compare.state === "idle" ? (
                    <StatusLine>Compare recent sell orders in the six royal cities.</StatusLine>
                  ) : byCity.length ? (
                    <ol>
                      {byCity.map((c, i) => (
                        <li key={c.city}>
                          <span>
                            <span className="city-dot" data-city={c.city} />
                            {c.city}
                            {i === 0 && !c.missing && <em>Cheapest</em>}
                          </span>
                          <i aria-hidden="true">
                            <b style={{ width: `${(c.total / top) * 100}%` }} />
                          </i>
                          <span className={styles.cityValue}>
                            <Silver value={c.total} animate={false} />
                            {c.missing ? (
                              <em className={styles.chip}>+{c.missing} unpriced</em>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <StatusLine>No royal city has a recent sell order for these items.</StatusLine>
                  )}
                </div>
              </>
            ) : (
              <EmptyWell
                emblem="tool-craft"
                title="Nothing on the list yet"
                line="Add your first item above. Build pages and the crafting calculator can also send their materials here."
                action={
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => commit({ ...list, entries: examplePlan() }, false)}
                  >
                    Try the example plan
                  </button>
                }
              />
            )}
            {message && <StatusLine>{message}</StatusLine>}
          </section>
          <div className={styles.side}>
            {list.entries.length > 0 && (
              <section
                className={`panel ${styles.summary}`}
                aria-labelledby="shopping-summary-title"
              >
                <PanelHead id="shopping-summary-title" emblem="silver" title="Still to buy" />
                <div
                  className={styles.figure}
                  data-complete={result.total !== null ? "" : undefined}
                >
                  <small>Purchase estimate</small>
                  <strong className="shopping-total">
                    {result.total !== null ? (
                      money(result.total)
                    ) : result.knownCost > 0 ? (
                      `${money(result.knownCost)}+`
                    ) : (
                      <Unavailable />
                    )}
                  </strong>
                  {(result.total !== null || result.knownCost > 0) && (
                    <small>
                      {result.total !== null
                        ? "silver after what you own"
                        : "silver so far, for the lines with a price"}
                    </small>
                  )}
                </div>
                <dl className={styles.stats}>
                  <div>
                    <dt>Owned</dt>
                    <dd>
                      {ownedQuantity.toLocaleString()} / {totalQuantity.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt>Items left</dt>
                    <dd>{result.remainingItems.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Lines ready</dt>
                    <dd>
                      {result.ready} / {list.entries.length}
                    </dd>
                  </div>
                </dl>
                {result.missing > 0 && (
                  <StatusLine tone="stale">
                    {result.missing} {result.missing === 1 ? "line needs" : "lines need"} a price:{" "}
                    {result.rows
                      .filter((row) => row.buy > 0 && row.cost === null)
                      .slice(0, 5)
                      .map((row) => `${row.name} in ${row.city}`)
                      .join(", ")}
                    {result.missing > 5 ? " and more" : ""}. Type your own price or refresh.
                  </StatusLine>
                )}
                <p className={styles.fine}>
                  Prices are recent sell orders or your own. Order fees and transport are separate;
                  check listings before you buy.
                </p>
              </section>
            )}
            <ShoppingAccountLists list={list} onLoad={(saved) => commit(saved)} />
          </div>
        </div>
      )}
    </div>
  );
}
