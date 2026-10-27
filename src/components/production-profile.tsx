"use client";
import { useState } from "react";
import {
  mechanicsProfile,
  productionCities,
  sourcedReturnRates,
  refiningEfficiency,
  returnProfileSource,
  refiningSpecSource,
  type MechanicsProfile,
} from "@/lib/albion/production-profile";
import { estimatedFocusCost } from "@/lib/albion/production";
export function ProductionProfile({
  kind,
  output,
  baseFocus,
  batches,
  saved,
  onApply,
}: {
  kind: "crafting" | "refining";
  output: string;
  baseFocus?: number;
  batches: number;
  saved: MechanicsProfile | null;
  onApply: (profile: MechanicsProfile, rates: ReturnType<typeof sourcedReturnRates>) => void;
}) {
  const initialProfile: MechanicsProfile = {
    version: "wiki-84429",
    city: "Lymhurst",
    dailyBonus: 0,
    refiningLevels: [0, 0, 0, 0, 0],
  };
  const savedKey = JSON.stringify(saved);
  const [record, setRecord] = useState({ key: savedKey, value: saved || initialProfile });
  const profile = record.key === savedKey ? record.value : saved || initialProfile;
  const [manualEfficiency, setManualEfficiency] = useState(0);
  const [message, setMessage] = useState("");
  const effective = profile;
  let rates: ReturnType<typeof sourcedReturnRates> | null = null;
  let focus: number | null = null;
  let efficiency = 0;
  try {
    rates = sourcedReturnRates(kind, output, effective.city, effective.dailyBonus);
    efficiency =
      kind === "refining"
        ? refiningEfficiency(Number(output[1]), effective.refiningLevels)
        : manualEfficiency;
    if (baseFocus) focus = estimatedFocusCost(baseFocus, efficiency, batches);
  } catch {}
  function change(next: MechanicsProfile) {
    setRecord({ key: savedKey, value: next });
    setMessage("");
  }
  return (
    <details className="production-model-notes">
      <summary>City & specialization profile</summary>
      <p>
        Source-backed planning profile. Wiki revision 84429 is not current-patch certification.
        Confirm station bonuses and daily events in game. Applying replaces return assumptions, not
        your prices or fees.
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
              <option key={city}>{city}</option>
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
      {kind === "refining" ? (
        <fieldset>
          <legend>Refining specialization levels</legend>
          <div className="input-grid">
            {profile.refiningLevels.map((level, index) => (
              <label key={index}>
                T{index + 4} specialization
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={level}
                  onChange={(e) =>
                    change({
                      ...profile,
                      refiningLevels: profile.refiningLevels.map((old, i) =>
                        i === index ? Number(e.target.value) : old,
                      ),
                    })
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <label>
          Total crafting focus cost efficiency
          <input
            type="number"
            min={0}
            max={100000}
            step={1}
            value={manualEfficiency}
            onChange={(e) => setManualEfficiency(Number(e.target.value))}
          />
        </label>
      )}
      <p>
        {rates
          ? `Profile preview: ${rates.bonus}% production bonus; ${rates.returnRate.toFixed(2)}% returns without focus, ${rates.focusReturnRate.toFixed(2)}% with focus.`
          : "This recipe is not covered by the profile."}
      </p>
      {focus !== null && (
        <p className="numeric">
          Estimated total focus: {focus.toLocaleString(undefined, { maximumFractionDigits: 3 })} ·
          efficiency {efficiency.toLocaleString()}
        </p>
      )}
      <p>
        Focus is an estimate, before unverified station rounding. Enter the actual total in the
        focus controls. Specialization reduces focus cost; it does not increase the return rate.
      </p>
      <button
        type="button"
        className="button secondary"
        onClick={() => {
          try {
            const selected = sourcedReturnRates(kind, output, profile.city, profile.dailyBonus);
            onApply(mechanicsProfile.parse(profile), selected);
            setMessage(
              "Production return assumptions applied. Review focus cost before enabling focus.",
            );
          } catch {
            setMessage("Check the city, recipe and specialization levels.");
          }
        }}
      >
        Apply production profile
      </button>
      <p role="status">{message}</p>
      <p>
        <a className="text-link" href={returnProfileSource} target="_blank" rel="noreferrer">
          Return-rate source
        </a>{" "}
        ·{" "}
        <a className="text-link" href={refiningSpecSource} target="_blank" rel="noreferrer">
          Specialization source
        </a>
      </p>
    </details>
  );
}
