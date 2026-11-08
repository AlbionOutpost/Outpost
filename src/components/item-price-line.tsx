"use client";
import { useEffect, useMemo, useState } from "react";
import {
  cheapestSellOrder,
  itemPricesResponse,
  type ItemSellOrder,
} from "@/lib/albion/item-prices";
import { sourceAge } from "@/lib/albion/source-age";
import { observedAt, Skeleton } from "./market-city-table";
import { Silver } from "./silver";
import styles from "./item-price-line.module.css";

type Answer = { key: string; orders?: ItemSellOrder[]; failed?: boolean; now: number };
export type ItemPriceState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; best: ReturnType<typeof cheapestSellOrder>; now: number };

/** Answers this tab already has, for the server's cache life: paging back costs no request. */
const memory = new Map<string, { at: number; orders: ItemSellOrder[] }>();
const MEMORY_MS = 60_000;

/**
 * The cheapest sell order (normal quality) for each item on the page: one request for the whole
 * page, once the page has settled, through `/api/items/prices`.
 */
export function useItemPrices(region: string, ids: string[], ready: boolean) {
  // A string key, so a new array of the same page never asks again.
  const key = `${region}|${[...ids].sort().join(",")}`;
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const items = key.slice(key.indexOf("|") + 1);
    if (!ready || !items) return;
    const controller = new AbortController();
    const kept = memory.get(key);
    const fresh = kept && Date.now() - kept.at < MEMORY_MS;
    // A short pause, so paging quickly through the list asks only for the page it stops on.
    const timer = setTimeout(
      async () => {
        if (fresh) return setAnswer({ key, orders: kept.orders, now: Date.now() });
        try {
          const response = await fetch(
            `/api/items/prices?${new URLSearchParams({ region, items })}`,
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error("Prices unavailable");
          const data = itemPricesResponse.parse(await response.json());
          const asked = new Set(items.split(","));
          if (data.region !== region || data.orders.some((o) => !asked.has(o.item)))
            throw new Error("Price identity mismatch");
          memory.set(key, { at: Date.now(), orders: data.orders });
          if (memory.size > 40) memory.delete(memory.keys().next().value!);
          setAnswer({ key, orders: data.orders, now: Date.now() });
        } catch {
          if (!controller.signal.aborted) setAnswer({ key, failed: true, now: Date.now() });
        }
      },
      fresh ? 0 : 350,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, region, ready, retry]);
  const current = answer?.key === key ? answer : null;
  const byItem = useMemo(() => {
    const map = new Map<string, ItemSellOrder[]>();
    for (const order of current?.orders ?? [])
      map.set(order.item, [...(map.get(order.item) ?? []), order]);
    return map;
  }, [current]);
  return {
    failed: !!current?.failed,
    retry: () => {
      setAnswer(null);
      setRetry((n) => n + 1);
    },
    state: (id: string): ItemPriceState =>
      !current
        ? { status: "loading" }
        : current.failed
          ? { status: "error" }
          : {
              status: "ok",
              best: cheapestSellOrder(byItem.get(id) ?? [], current.now),
              now: current.now,
            },
  };
}

/** One item's cheapest sell order: the figure, its city and how long ago it was seen. A stale
 * order keeps its amber age and "Stale" mark; no order is an em dash, never a zero. */
export function ItemPriceLine({ state }: { state: ItemPriceState }) {
  if (state.status === "loading")
    return (
      <span className={styles.line} data-price="loading">
        <span className={styles.figure}>
          <Skeleton>00,000</Skeleton>
        </span>
        <small className={styles.where}>
          <Skeleton>Martlock · 1 min ago</Skeleton>
        </small>
      </span>
    );
  if (state.status === "error" || !state.best)
    return (
      <span className={`${styles.line} ${styles.missing}`} data-price="missing">
        <span className={styles.figure}>—</span>
        <small className={styles.where}>
          {state.status === "error" ? "Price unavailable" : "No recent price"}
        </small>
      </span>
    );
  const { price, city, observedAt: date } = state.best;
  const age = sourceAge(date, state.now);
  return (
    <span className={styles.line} data-price={age.stale ? "stale" : "fresh"}>
      <span className={styles.figure}>
        <span className="sr-only">Cheapest sell order </span>
        <Silver value={price} animate={false} />
      </span>
      <small className={`${styles.where}${age.stale ? ` ${styles.stale}` : ""}`}>
        <span className="city-dot" data-city={city} aria-hidden="true" />
        <span className={styles.city}>{city}</span>
        <time dateTime={date} title={`${observedAt(date)} UTC`}>
          {age.label}
        </time>
        {age.stale && (
          <span className={styles.staleMark} title="Stale: seen more than an hour ago">
            <span className="sr-only">Stale</span>
          </span>
        )}
      </small>
    </span>
  );
}
