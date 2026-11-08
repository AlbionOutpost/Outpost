"use client";
import { useState } from "react";
import Link from "@/components/link";
import { Disclosure } from "./disclosure";
import { WellSelect } from "./well-select";
import shell from "./calculator-shell.module.css";
import own from "@/app/production-calculator.module.css";
import { useMasteryLevels } from "./use-mastery-levels";
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
import { NumberField } from "./number-field";
// The shared calculator wells, plus the crafting family's own rules.
const s = { ...shell, ...own };
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
  // Levels are shared with the Specialization & focus page: on the account when signed in.
  const stored = useMasteryLevels(),
    levels = stored.levels;
  const setLevels = (update: (l: Record<string, number>) => Record<string, number>) =>
    stored.save(update(levels));
  const [message, setMessage] = useState("");
  const specs = focusSpecsFor(output);
  // Refining keeps its five tier specs in the saved profile so scenarios restore them.
  const refiningSpecIds =
    kind === "refining"
      ? (masteryCategories
          .find((c) => c.id === specs[0]?.categoryId)
          ?.specs.toSorted((a, b) => a.sortOrder - b.sortOrder)
          .map((s) => s.id) ?? [])
      : [];
  const effectiveLevels =
    kind === "refining"
      ? {
          ...levels,
          ...Object.fromEntries(
            refiningSpecIds.map((id, i) => [id, profile.refiningLevels[i] ?? 0]),
          ),
        }
      : levels;
  let rates: ReturnType<typeof sourcedReturnRates> | null = null;
  let efficiency = 0;
  let perCraft: number | null = null;
  try {
    rates = sourcedReturnRates(kind, output, profile.city, profile.dailyBonus, recipeId);
  } catch {}
  try {
    efficiency = focusEfficiency(output, effectiveLevels);
    if (baseFocus) perCraft = focusPerCraft(baseFocus, efficiency);
  } catch {}
  function change(next: MechanicsProfile) {
    setRecord({ key: savedKey, value: next });
    setMessage("");
  }
  return (
    <Disclosure summary="City & specialization profile">
      <div className={s.profile} data-production-profile="">
        <p>
          Royal-city return rates from the local production bonus table: 18 base efficiency, +
          {kind === "refining" ? "40 refining" : "15 crafting"} in the specialty city
          {rates?.specialtyCity ? ` (${rates.specialtyCity} for this item)` : ""}, + the daily
          bonus, +59 with focus. Hideouts, islands and events are not modelled. Applying replaces
          return assumptions, not your prices or fees.
        </p>
        <div className={s.fields}>
          <label>
            Production city
            <WellSelect
              aria-label="Production city"
              value={profile.city}
              onChange={(e) =>
                change({ ...profile, city: e.target.value as MechanicsProfile["city"] })
              }
            >
              {productionCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                  {rates?.specialtyCity === city ? " · specialty" : ""}
                </option>
              ))}
            </WellSelect>
          </label>
          <label>
            Confirmed daily bonus
            <WellSelect
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
            </WellSelect>
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
              setMessage("Production return assumptions applied to every returnable material.");
            } catch {
              setMessage("Check the city and daily bonus.");
            }
          }}
        >
          Apply production profile
        </button>
        {message && <p role="status">{message}</p>}
        {baseFocus ? (
          <fieldset className={s.specs}>
            <legend>Specialization levels (focus cost)</legend>
            <p>
              Shared with{" "}
              <Link className="text-link" href="/tools/mastery">
                Specialization &amp; focus
              </Link>{" "}
              on this device.
            </p>
            {kind === "refining" && refiningSpecIds.length === 5 ? (
              <div className={s.fields}>
                {refiningSpecIds.map((id, index) => (
                  <label key={id}>
                    T{index + 4} specialization
                    <NumberField
                      min={0}
                      max={100}
                      value={profile.refiningLevels[index]}
                      onValueChange={(v) => {
                        const value = v ?? NaN;
                        change({
                          ...profile,
                          refiningLevels: profile.refiningLevels.map((old, i) =>
                            i === index ? value : old,
                          ),
                        });
                        if (Number.isInteger(value) && value >= 0 && value <= 100)
                          setLevels((l) => ({ ...l, [id]: value }));
                      }}
                    />
                  </label>
                ))}
              </div>
            ) : specs.length ? (
              <div className={s.fields}>
                {specs.map((spec) => (
                  <label key={spec.specId}>
                    <span>
                      {specNames.get(spec.specId) ?? spec.specId}
                      <small> · {spec.perLevel} per level</small>
                    </span>
                    <NumberField
                      min={0}
                      max={100}
                      value={levels[spec.specId] ?? 0}
                      onValueChange={(v) => setLevels((l) => ({ ...l, [spec.specId]: v ?? NaN }))}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <p>No specialization reduces this recipe&apos;s focus cost.</p>
            )}
            <p className={s.figureLine}>
              Efficiency {efficiency.toLocaleString()} ·{" "}
              {perCraft === null
                ? "check the levels (0–100)"
                : `${perCraft.toLocaleString(undefined, { maximumFractionDigits: 1 })} focus per craft (base ${baseFocus.toLocaleString()}) · Estimated total focus: ${(perCraft * batches).toLocaleString(undefined, { maximumFractionDigits: 3 })} for ${batches} craft${batches === 1 ? "" : "s"}`}
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
            <p>
              focus = base ÷ 2^(efficiency ÷ 10,000). The station rounds the result; enter its
              figure if it differs.
            </p>
          </fieldset>
        ) : null}
        <p>Source: {returnProfileSource}.</p>
      </div>
    </Disclosure>
  );
}
