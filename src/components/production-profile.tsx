"use client";
import { useState } from "react";
import {
  mechanicsProfile,
  productionCities,
  sourcedReturnRates,
  returnProfileSource,
  type MechanicsProfile,
} from "@/lib/albion/production-profile";
import {
  focusSpecsFor,
  focusEfficiency,
  focusPerCraft,
  masteryCategories,
} from "@/lib/albion/focus";
const specNames = new Map(
  masteryCategories.flatMap((c) => c.specs.map((s) => [s.id, `${s.name}`] as const)),
);
export function ProductionProfile({
  kind,
  output,
  recipeId,
  baseFocus,
  batches,
  saved,
  onApply,
  onFocus,
}: {
  kind: "crafting" | "refining";
  output: string;
  recipeId?: string;
  baseFocus?: number;
  batches: number;
  saved: MechanicsProfile | null;
  onApply: (profile: MechanicsProfile, rates: ReturnType<typeof sourcedReturnRates>) => void;
  onFocus?: (totalFocus: number) => void;
}) {
  const initialProfile: MechanicsProfile = {
    version: "grind-20261027",
    city: "Lymhurst",
    dailyBonus: 0,
    refiningLevels: [0, 0, 0, 0, 0],
  };
  const savedKey = JSON.stringify(saved);
  const [record, setRecord] = useState({ key: savedKey, value: saved || initialProfile });
  const profile = record.key === savedKey ? record.value : saved || initialProfile;
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const specs = focusSpecsFor(output);
  let rates: ReturnType<typeof sourcedReturnRates> | null = null;
  let efficiency = 0;
  let perCraft: number | null = null;
  try {
    rates = sourcedReturnRates(kind, output, profile.city, profile.dailyBonus, recipeId);
  } catch {}
  try {
    efficiency = focusEfficiency(output, levels);
    if (baseFocus) perCraft = focusPerCraft(baseFocus, efficiency);
  } catch {}
  function change(next: MechanicsProfile) {
    setRecord({ key: savedKey, value: next });
    setMessage("");
  }
  return (
    <details className="production-model-notes">
      <summary>City bonus & specialization</summary>
      <p>
        Royal-city return rates from the local production bonus table: 18 base efficiency, +
        {kind === "refining" ? "40 refining" : "15 crafting"} in the specialty city
        {rates?.specialtyCity ? ` (${rates.specialtyCity} for this item)` : ""}, + the daily bonus,
        +59 with focus. Hideouts, islands and events are not modelled. Applying replaces return
        assumptions, not your prices or fees.
      </p>
      <div className="input-grid">
        <label>
          Production city
          <select
            aria-label="Production city"
            value={profile.city}
            onChange={(e) =>
              change({ ...profile, city: e.target.value as MechanicsProfile["city"] })
            }
          >
            {productionCities.map((city) => (
              <option key={city}>
                {city}
                {rates?.specialtyCity === city ? " · specialty" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Confirmed daily bonus
          <select
            aria-label="Confirmed daily bonus"
            value={profile.dailyBonus}
            onChange={(e) =>
              change({ ...profile, dailyBonus: Number(e.target.value) as 0 | 10 | 20 })
            }
          >
            {[0, 10, 20].map((n) => (
              <option key={n} value={n}>
                {n}%
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        {rates
          ? `${rates.bonus} production efficiency → ${rates.returnRate.toFixed(2)}% returns without focus, ${rates.focusReturnRate.toFixed(2)}% with focus.`
          : "No city bonus data for this item."}
      </p>
      <button
        type="button"
        className="button secondary"
        onClick={() => {
          try {
            const selected = sourcedReturnRates(
              kind,
              output,
              profile.city,
              profile.dailyBonus,
              recipeId,
            );
            onApply(mechanicsProfile.parse({ ...profile, version: "grind-20261027" }), selected);
            setMessage("Return rates applied to every returnable material.");
          } catch {
            setMessage("Check the city and daily bonus.");
          }
        }}
      >
        Apply city return rates
      </button>
      <p role="status">{message}</p>
      {baseFocus ? (
        <fieldset className="production-spec-levels">
          <legend>Specialization levels (focus cost)</legend>
          {specs.length ? (
            <div className="input-grid">
              {specs.map((spec) => (
                <label key={spec.specId}>
                  {specNames.get(spec.specId) ?? spec.specId}
                  <small> · {spec.perLevel} per level</small>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={levels[spec.specId] ?? 0}
                    onChange={(e) =>
                      setLevels((l) => ({ ...l, [spec.specId]: Number(e.target.value) }))
                    }
                  />
                </label>
              ))}
            </div>
          ) : (
            <p className="muted">No specialization reduces this recipe&apos;s focus cost.</p>
          )}
          <p className="numeric">
            Efficiency {efficiency.toLocaleString()} ·{" "}
            {perCraft === null
              ? "check the levels (0–100)"
              : `${perCraft.toLocaleString(undefined, { maximumFractionDigits: 1 })} focus per craft (base ${baseFocus.toLocaleString()}) · ${(perCraft * batches).toLocaleString(undefined, { maximumFractionDigits: 0 })} for ${batches} craft${batches === 1 ? "" : "s"}`}
          </p>
          {onFocus && perCraft !== null && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                onFocus(Math.round(perCraft * batches));
                setMessage("Focus total applied. Confirm it against your station.");
              }}
            >
              Use this focus total
            </button>
          )}
          <p className="muted">
            focus = base ÷ 2^(efficiency ÷ 10,000). The station rounds the result; enter its figure
            if it differs.
          </p>
        </fieldset>
      ) : null}
      <p className="muted">Source: {returnProfileSource}.</p>
    </details>
  );
}
