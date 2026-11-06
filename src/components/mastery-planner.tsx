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
import { CalculatorShell, useCalculatorStep } from "./calculator-shell";
import { Disclosure } from "./disclosure";
import { PanelHead } from "./panel-head";
import { StatusLine } from "./status-line";
import { Missing } from "./calculator-figures";
import { WellSelect } from "./well-select";
import s from "./calculator-shell.module.css";
import c from "@/app/calculators.module.css";
import { SearchInput } from "./field";
const groups = Object.entries(masteryGroups);
const steps = ["mastery-board", "mastery-focus"];
const specsOf = (ids: string[]) =>
  masteryCategories.filter((c) => ids.includes(c.id)).flatMap((c) => c.specs.map((s) => s.id));
export function MasteryPlanner() {
  const [levels, setLevels] = useState<MasteryLevels>({});
  const [loaded, setLoaded] = useState(false);
  const [group, setGroup] = useState(groups[0][0]);
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ key: string; recipes: Recipe[]; error?: boolean } | null>(
    null,
  );
  const [step, goToStep] = useCalculatorStep(steps);
  useEffect(() => {
    // Hydrate from this device after mount so server and client markup match.
    queueMicrotask(() => {
      setLevels(readMasteryLevels());
      setLoaded(true);
    });
  }, []);
  const categories = masteryCategories.filter((c) =>
    masteryGroups[group].categoryIds.includes(c.id),
  );
  // Before you search, the check shows the first item of the open board section.
  const example = categories[0]?.itemId ?? "T4_MAIN_AXE";
  const searching = query.trim().length >= 2;
  const term = searching ? query.trim() : example;
  useEffect(() => {
    const active = new AbortController();
    const timer = setTimeout(
      () => {
        const ask = (kind: string, limit: number) =>
          fetch(`/api/recipes?${new URLSearchParams({ kind, q: term, limit: String(limit) })}`, {
            signal: active.signal,
          }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("unavailable"))));
        Promise.all([ask("crafting", searching ? 8 : 3), ask("refining", searching ? 4 : 2)])
          .then(([a, b]: { recipes: Recipe[] }[]) =>
            setFound({ key: term, recipes: [...(a.recipes ?? []), ...(b.recipes ?? [])] }),
          )
          .catch(() => {
            if (!active.signal.aborted) setFound({ key: term, recipes: [], error: true });
          });
      },
      searching ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      active.abort();
    };
  }, [term, searching]);
  function save(next: MasteryLevels) {
    setLevels(next);
    setStatus(
      writeMasteryLevels(next)
        ? { text: "Saved in this browser." }
        : { text: "This browser couldn’t save your levels.", error: true },
    );
  }
  function set(id: string, value: number) {
    save({ ...levels, [id]: Math.max(0, Math.min(100, Math.round(value || 0))) });
  }
  const total = (ids: string[]) => ids.reduce((sum, id) => sum + (levels[id] ?? 0), 0);
  const rail = (
    <section className={`panel ${c.rail}`} aria-labelledby="mastery-groups-title">
      <PanelHead id="mastery-groups-title" title="Destiny board" line="Pick a section to edit." />
      <label className={c.railPick}>
        Board section
        <WellSelect value={group} onChange={(e) => setGroup(e.target.value)}>
          {groups.map(([id, g]) => (
            <option key={id} value={id}>
              {g.label}
              {loaded ? ` · ${total(specsOf(g.categoryIds))} levels` : ""}
            </option>
          ))}
        </WellSelect>
      </label>
      <ul className={c.railList}>
        {groups.map(([id, g]) => {
          return (
            <li key={id}>
              <button type="button" aria-pressed={group === id} onClick={() => setGroup(id)}>
                <span>
                  {g.label}
                  <small>
                    {loaded
                      ? `${total(specsOf(g.categoryIds)).toLocaleString()} levels`
                      : "Loading…"}
                  </small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
  const board = (
    <>
      {status?.error && <StatusLine tone="error">{status.text}</StatusLine>}
      <div className={c.categories}>
        {categories.map((category, index) => {
          const ids = category.specs.map((s) => s.id);
          return (
            <Disclosure
              key={category.id}
              defaultOpen={index === 0}
              summary={<span className={c.categoryName}>{category.name}</span>}
              meta={loaded ? `${total(ids)} / ${ids.length * 100}` : undefined}
            >
              <div className={c.specs}>
                <ul>
                  {category.specs.map((spec) => (
                    <li key={spec.id}>
                      <label htmlFor={`spec-${spec.id}`}>{spec.name}</label>
                      <input
                        id={`spec-${spec.id}`}
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        disabled={!loaded}
                        value={levels[spec.id] ?? 0}
                        onChange={(e) => set(spec.id, Number(e.target.value))}
                      />
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`button secondary ${c.start}`}
                  onClick={() => {
                    const next = { ...levels };
                    for (const s of category.specs) next[s.id] = 100;
                    save(next);
                  }}
                >
                  Set all to 100
                </button>
              </div>
            </Disclosure>
          );
        })}
      </div>
    </>
  );
  const recipes = found?.key === term ? found.recipes : null;
  const focus = (
    <>
      <label>
        Item
        <SearchInput
          type="search"
          placeholder="Search an item, e.g. Battleaxe"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <p className={s.help}>
        {searching
          ? `Recipes matching “${query.trim()}”, with your levels.`
          : `For example, the first item of ${masteryGroups[group].label}. Search to check another.`}
      </p>
      {recipes === null ? (
        <StatusLine>Loading recipes…</StatusLine>
      ) : found?.error ? (
        <StatusLine tone="error">Recipes couldn’t be loaded. Try the search again.</StatusLine>
      ) : !recipes.length ? (
        <StatusLine>No recipe matches. Try another item name.</StatusLine>
      ) : (
        <ul className={c.focusList} data-result="focus-check">
          {recipes.map((r) => {
            let efficiency = 0,
              perCraft: number | null = null;
            try {
              efficiency = focusEfficiency(r.output, levels);
              perCraft = r.baseFocus ? focusPerCraft(r.baseFocus, efficiency) : null;
            } catch {}
            return (
              <li key={r.id}>
                <ItemIcon id={r.output} size={40} />
                <span>
                  <strong>{r.name}</strong>
                  <small>
                    {r.baseFocus
                      ? `${r.baseFocus.toLocaleString()} base · efficiency ${efficiency.toLocaleString()}`
                      : "Uses no focus"}
                  </small>
                </span>
                {r.baseFocus && perCraft !== null ? (
                  <b>
                    {perCraft.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                    <small className={c.unit}> focus</small>
                  </b>
                ) : r.baseFocus ? (
                  <Missing />
                ) : (
                  <small className={c.unit}>None</small>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className={s.stack}>
        <Disclosure summary="How this is calculated">
          <div className={c.prose}>
            <p>
              Each spec level adds efficiency to the items it covers. Focus per craft is the base
              cost ÷ 2^(efficiency ÷ 10,000), so 10,000 efficiency halves it.
            </p>
            <p>The station rounds the final figure, so the game can show one focus more or less.</p>
          </div>
        </Disclosure>
      </div>
    </>
  );
  return (
    <div className={s.journey}>
      <CalculatorShell
        label="Specialization workflow"
        step={step}
        onStep={goToStep}
        rail={rail}
        steps={[
          {
            id: steps[0],
            label: "Your specs",
            title: masteryGroups[group].label,
            line: "Your level in each spec, 0 to 100.",
            actions: (
              <span className={c.chip} role="status">
                {status && !status.error ? status.text : "Saved in this browser"}
              </span>
            ),
            children: board,
          },
          {
            id: steps[1],
            label: "Focus check",
            title: "Focus check",
            line: "What a craft costs in focus with your levels.",
            children: focus,
          },
        ]}
      />
    </div>
  );
}
