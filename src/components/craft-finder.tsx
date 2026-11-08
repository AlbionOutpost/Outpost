"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "@/components/link";
import { useOutpostRegion } from "./region-context";
import { cities } from "@/lib/albion/region-config";
import { craftCategories } from "@/lib/albion/craft-categories";
import { productionCities } from "@/lib/albion/production-profile";
import { rankCrafts, type CraftRow, type CraftSettings } from "@/lib/albion/craft-ranking";
import { craftLinkHref } from "@/lib/albion/craft-link";
import type { Recipe } from "@/lib/albion/recipes";
import type { MarketPrice } from "@/lib/albion/market-quotes";
import { ItemIcon } from "./item-icon";
import { PanelHead } from "./panel-head";
import { Disclosure } from "./disclosure";
import { EmptyWell } from "./empty-well";
import { RetryLine } from "./calculator-shell";
import { StatusLine, Unavailable } from "./status-line";
import { WellSelect } from "./well-select";
import { NumberField } from "./number-field";
import { TaxField } from "./tax-field";
import { Observed, coin, PRICE_ERROR } from "./calculator-figures";
import s from "./calculator-shell.module.css";
import c from "@/app/calculators.module.css";
import m from "./market-scans.module.css";

const qualities = ["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"];
const groups = [...new Set(craftCategories.map((g) => g.group))];
const TOP = 10;
type Data = { recipes: Recipe[]; prices: MarketPrice[]; candidates: number; quality: number };
const shortName = (name: string) => name.replace(/ · T\d\.\d.*$/, "");

/**
 * "What should I craft?": every primary recipe of a category at one tier and enchantment, priced
 * from one bounded batch of observations and run through the Crafting calculator's own
 * production() with the player's markets, city returns, tax and budget. Only the selection
 * fetches; every other setting re-ranks in place.
 */
export function CraftFinder() {
  const region = useOutpostRegion(),
    [category, setCategory] = useState<string>("sword"),
    [tier, setTier] = useState(6),
    [enchantment, setEnchantment] = useState(0),
    [quality, setQuality] = useState(1),
    [buyCity, setBuyCity] = useState<CraftSettings["buyCity"]>("Lymhurst"),
    [craftCity, setCraftCity] = useState<CraftSettings["craftCity"]>("Lymhurst"),
    [sellCity, setSellCity] = useState<CraftSettings["sellCity"]>("Lymhurst"),
    [dailyBonus, setDailyBonus] = useState<CraftSettings["dailyBonus"]>(0),
    [budget, setBudget] = useState<number | null>(null),
    [tax, setTax] = useState<number | null>(4),
    [setupFee, setSetupFee] = useState<number | null>(2.5),
    [showAll, setShowAll] = useState(false),
    [result, setResult] = useState<{ key: string; data: Data } | null>(null),
    [error, setError] = useState<string | null>(null),
    [pendingKey, setPendingKey] = useState<string | null>(null);
  const consumable = category === "food" || category === "potion";
  const query = new URLSearchParams({
    region,
    category,
    tier: String(tier),
    enchantment: String(enchantment),
    quality: String(consumable ? 1 : quality),
  }).toString();
  const busy = pendingKey === query;
  const data = result?.key === query ? result.data : null;
  const controller = useRef<AbortController | null>(null);
  async function load() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const key = query;
    setPendingKey(key);
    setError(null);
    try {
      const r = await fetch(`/api/economy/crafts?${key}`, { signal: active.signal });
      if (!r.ok) throw new Error("Craft request failed");
      const body = (await r.json()) as Data;
      if (!active.signal.aborted) {
        setResult({ key, data: body });
        setShowAll(false);
      }
    } catch {
      if (!active.signal.aborted) setError(key);
    } finally {
      if (controller.current === active) setPendingKey(null);
    }
  }
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    const timer = window.setTimeout(() => void loadRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => () => controller.current?.abort(), []);
  let ranking: ReturnType<typeof rankCrafts> | null = null,
    invalid = "";
  if (data)
    try {
      ranking = rankCrafts(
        data.recipes,
        data.prices,
        {
          region,
          buyCity,
          craftCity,
          sellCity,
          quality: data.quality,
          dailyBonus,
          tax: tax ?? NaN,
          setupFee: setupFee ?? NaN,
        },
        budget,
      );
    } catch {
      invalid =
        budget !== null && !(budget > 0)
          ? "Enter a budget above 0, or clear it to rank by silver per craft."
          : "Enter tax and setup fee from 0 to 100%.";
    }
  const names = new Map(
    data?.recipes.flatMap((r) => [
      [r.output, shortName(r.name)] as const,
      ...r.ingredients.map((i) => [i.id, i.name] as const),
    ]) ?? [],
  );
  const shown = ranking ? (showAll ? ranking.ranked : ranking.ranked.slice(0, TOP)) : [];
  const listed = ranking
    ? [...shown, ...(showAll || ranking.ranked.length <= TOP ? ranking.unpriced : [])]
    : [];
  const profitable = ranking?.ranked.filter((r) => r.total! > 0).length ?? 0;
  const ranked = ranking?.ranked.length ?? 0;
  const per = budget === null ? "per craft" : "for your budget";
  return (
    <section className={`panel ${c.scanner}`} aria-labelledby="craft-finder-heading">
      <PanelHead
        id="craft-finder-heading"
        title="What should I craft?"
        line="Every recipe in a category, priced where you buy and sell, ranked by what it makes."
        actions={
          <button
            type="button"
            className={`button secondary ${s.refresh}`}
            aria-busy={busy}
            disabled={busy}
            onClick={() => void load()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {busy ? "Loading…" : "Refresh prices"}
          </button>
        }
      />
      <div className={c.scanSetup}>
        <div className={`${s.fields} ${c.routeFields}`}>
          <label>
            Category
            <WellSelect value={category} onChange={(e) => setCategory(e.target.value)}>
              {groups.map((group) => (
                <optgroup key={group} label={group}>
                  {craftCategories
                    .filter((g) => g.group === group)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </WellSelect>
          </label>
          <label>
            Tier
            <WellSelect value={tier} onChange={(e) => setTier(Number(e.target.value))}>
              {[2, 3, 4, 5, 6, 7, 8].map((t) => (
                <option key={t} value={t}>
                  T{t}
                </option>
              ))}
            </WellSelect>
          </label>
          <label>
            Enchantment
            <WellSelect
              value={enchantment}
              onChange={(e) => setEnchantment(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  .{n}
                </option>
              ))}
            </WellSelect>
          </label>
          <label>
            Quality
            <WellSelect
              value={consumable ? 1 : quality}
              disabled={consumable}
              onChange={(e) => setQuality(Number(e.target.value))}
            >
              {qualities.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </WellSelect>
          </label>
          <label>
            Buy materials in
            <WellSelect
              value={buyCity}
              onChange={(e) => setBuyCity(e.target.value as CraftSettings["buyCity"])}
            >
              {cities
                .filter((city) => city !== "Black Market")
                .map((city) => (
                  <option key={city}>{city}</option>
                ))}
            </WellSelect>
          </label>
          <label>
            Craft in
            <WellSelect
              value={craftCity}
              onChange={(e) => setCraftCity(e.target.value as CraftSettings["craftCity"])}
            >
              {productionCities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </WellSelect>
          </label>
          <label>
            Sell in
            <WellSelect
              value={sellCity}
              onChange={(e) => setSellCity(e.target.value as CraftSettings["sellCity"])}
            >
              {cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </WellSelect>
          </label>
          <label>
            Budget (silver)
            <NumberField
              silver
              min={0}
              placeholder="No limit"
              value={budget}
              onValueChange={setBudget}
            />
          </label>
        </div>
        <div className={c.scanItems}>
          <TaxField value={tax} onChange={setTax} />
          <div className={s.stack}>
            <Disclosure
              summary="Returns & fees"
              meta={`${dailyBonus ? `+${dailyBonus}% daily · ` : ""}${setupFee ?? "—"}% setup`}
            >
              <div className={s.fields}>
                <label>
                  Daily production bonus
                  <WellSelect
                    value={dailyBonus}
                    onChange={(e) =>
                      setDailyBonus(Number(e.target.value) as CraftSettings["dailyBonus"])
                    }
                  >
                    {[0, 10, 20].map((n) => (
                      <option key={n} value={n}>
                        {n}%
                      </option>
                    ))}
                  </WellSelect>
                </label>
                <label>
                  Sell order setup fee (%)
                  <NumberField
                    min={0}
                    max={100}
                    step={0.5}
                    decimals={1}
                    value={setupFee}
                    onValueChange={setSetupFee}
                  />
                </label>
                <p className={s.help}>
                  Returns come from the city table the Crafting calculator uses: 18 base, +15 in the
                  category&apos;s specialty city, plus the daily bonus. No focus, no station fee.
                  The Black Market buys instantly, so no setup fee applies there.
                </p>
              </div>
            </Disclosure>
          </div>
        </div>
      </div>
      {error === query ? (
        <RetryLine onRetry={() => void load()}>{PRICE_ERROR}</RetryLine>
      ) : invalid ? (
        <StatusLine tone="error">{invalid}</StatusLine>
      ) : !ranking ? (
        <StatusLine>Loading recipes and prices…</StatusLine>
      ) : !data?.recipes.length ? null : (
        <StatusLine>
          {profitable} of {data.recipes.length}{" "}
          {data.recipes.length === 1 ? "craft makes" : "crafts make"} silver {per}, best first
          {ranking.overBudget.length
            ? `; ${ranking.overBudget.length} cost more than your budget for one craft`
            : ""}
          {ranking.unpriced.length ? `; ${ranking.unpriced.length} can't be priced` : ""}.
          {data.candidates > data.recipes.length
            ? ` ${data.recipes.length} of ${data.candidates} recipes fit one price request.`
            : ""}
        </StatusLine>
      )}
      {data && !data.recipes.length ? (
        <EmptyWell
          emblem="tool-craft"
          title="No recipes here"
          line={`No T${tier}.${enchantment} recipes are recorded for this category. Try another tier or enchantment.`}
        />
      ) : (
        <div className={c.flips} role="region" aria-label="Ranked crafts">
          <div className={c.flipHead} aria-hidden="true">
            <span>Craft</span>
            <span>Materials · {buyCity}</span>
            <span>Sells for · {sellCity}</span>
            <span>Profit</span>
            <span>Margin</span>
            <span />
          </div>
          <ul>
            {listed.map((r) => (
              <CraftLine key={r.recipe.id} row={r} names={names} budget={budget} />
            ))}
          </ul>
          {ranking && ranked > TOP && (
            <div className={m.more}>
              <button
                type="button"
                className="pill-link is-small"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? `Show the top ${TOP}`
                  : `Show all ${ranked}${ranking.unpriced.length ? ` and ${ranking.unpriced.length} unpriced` : ""}`}
              </button>
            </div>
          )}
        </div>
      )}
      <div className={s.stack}>
        <Disclosure summary="How crafts are ranked">
          <div className={c.prose}>
            <p>
              Each recipe runs through the Crafting calculator: materials bought from the lowest
              sell order in {buyCity}, crafted in {craftCity} with its city returns valued at what
              you paid, the item listed in {sellCity}
              {sellCity === "Black Market" ? " (sold to its highest buy order)" : ""}, minus{" "}
              {tax ?? "your"}% tax
              {sellCity === "Black Market" ? "" : ` and a ${setupFee ?? "—"}% setup fee`}. With a
              budget, crafts are counted in whole crafts you can pay for up front.
            </p>
            <p>
              Results use observed Albion Online Data Project prices, each with its own age; the
              oldest price in a row is shown and past an hour it is stale. A missing price is never
              treated as zero. How much sells and how fast isn&apos;t counted. Open a craft to check
              every price in the calculator.
            </p>
          </div>
        </Disclosure>
      </div>
    </section>
  );
}

function CraftLine({
  row: r,
  names,
  budget,
}: {
  row: CraftRow;
  names: Map<string, string>;
  budget: number | null;
}) {
  const name = shortName(r.recipe.name);
  const sale = r.run.prices[r.recipe.output];
  const outcome = !r.complete ? "incomplete" : r.total! > 0 ? "positive" : "negative";
  const missing = r.missing.map((id) => names.get(id) ?? id);
  return (
    <li className={c.flip} data-outcome={outcome}>
      <ItemIcon id={r.recipe.output} quality={r.run.quality} size={40} />
      <span className={c.flipName}>
        <strong>{name}</strong>
        <small>
          {!r.complete
            ? `No price for ${missing.join(", ")}`
            : `${budget === null ? "" : `${r.crafts!.toLocaleString()} × `}${Math.round(r.profit!).toLocaleString()} per craft${r.recipe.outputCount > 1 ? ` (${r.recipe.outputCount} items)` : ""}`}
        </small>
      </span>
      <span className={c.flipPrice}>
        <span className={c.flipLabel}>Materials per craft</span>
        {r.upfront != null ? coin(r.upfront) : <Unavailable />}
        <small>
          {r.oldestAt && r.upfront != null ? (
            <>
              oldest <Observed at={r.oldestAt} />
            </>
          ) : null}
        </small>
      </span>
      <span className={c.flipPrice}>
        <span className={c.flipLabel}>Sells for</span>
        {sale?.value ? (
          <>
            {coin(sale.value * r.recipe.outputCount)}
            <small>{sale.observedAt ? <Observed at={sale.observedAt} /> : null}</small>
          </>
        ) : (
          <Unavailable />
        )}
      </span>
      <span className={c.flipNet}>
        <span className="sr-only">Profit: </span>
        {r.total != null ? (
          coin(r.total)
        ) : (
          <span className={c.flipNa}>
            —<span className="sr-only"> Unavailable</span>
          </span>
        )}
      </span>
      <span className={c.flipMargin}>
        <span className="sr-only">Margin: </span>
        {r.margin == null ? "" : `${r.margin.toFixed(1)}%`}
      </span>
      <Link
        className={`pill-link ${c.flipAction}`}
        aria-label={`Open ${name} in the calculator`}
        href={craftLinkHref(r)}
      >
        Open <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </li>
  );
}
