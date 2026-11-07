"use client";
import { useState } from "react";
import {
  crestColors,
  crestCharges,
  defaultCrest,
  resolveCrestCharge,
  resolveCrestColor,
  teamActivities,
  type CrestColor,
} from "@/lib/groups/crest";
import { TeamMark } from "./group-parts";
import styles from "./teams.module.css";

const colourName = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

/** Read the identity fields back out of a form, in the shape the Team APIs take. */
export function identityFromForm(f: FormData) {
  return {
    crestItem: (f.get("crestItem") as string) || null,
    crestColor: (f.get("crestColor") as string) || null,
    activities: f.getAll("activities"),
    recruiting: f.get("recruiting") === "on",
  };
}

/**
 * The crest picker (a palette field and an item render, or the team's initials), up to three
 * activities and whether the team takes join requests. Plain form inputs, so the surrounding
 * form posts them; the server validates every value again.
 */
export function TeamIdentityFields({
  name,
  crestItem,
  crestColor,
  activities = [],
  recruiting = true,
}: {
  name: string;
  crestItem?: string | null;
  crestColor?: string | null;
  activities?: readonly string[];
  recruiting?: boolean;
}) {
  const [item, setItem] = useState<string>(resolveCrestCharge(crestItem));
  const [color, setColor] = useState<CrestColor>(resolveCrestColor(crestColor));
  const [plays, setPlays] = useState<string[]>([...activities]);
  return (
    <div className={styles.identity}>
      <fieldset className={styles.crestPicker}>
        <legend>Crest</legend>
        <div className={styles.crestPreview}>
          <TeamMark name={name || "Team"} crestItem={item} crestColor={color} />
          <p>Pick a shield and a symbol. New teams start on the Outpost tower.</p>
        </div>
        <div className={styles.swatches} role="radiogroup" aria-label="Crest shield">
          {crestColors.map((c) => (
            <label
              key={c}
              className={styles.swatch}
              title={colourName(c)}
              style={{ "--shield": `url("/albion/crests/crest-${c}.webp")` } as React.CSSProperties}
            >
              <input
                type="radio"
                name="crestColor"
                value={c}
                checked={color === c}
                onChange={() => setColor(c)}
              />
              <span className="sr-only">{colourName(c)}</span>
            </label>
          ))}
        </div>
        <div className={styles.charges} role="radiogroup" aria-label="Crest symbol">
          {crestCharges.map((c) => (
            <label key={c} className={styles.charge} title={colourName(c)}>
              <input
                type="radio"
                name="crestItem"
                value={c}
                checked={item === c}
                onChange={() => setItem(c)}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/albion/charges/${c}.webp`} alt="" width={36} height={36} />
              <span className="sr-only">
                {colourName(c)}
                {c === defaultCrest.charge ? " (default)" : ""}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.playsPicker}>
        <legend>What you play</legend>
        <p className={styles.pickerHint}>Up to three. Players filter the directory by these.</p>
        <div className={styles.playOptions}>
          {teamActivities.map((a) => {
            const on = plays.includes(a);
            return (
              <label key={a} className={styles.playOption}>
                <input
                  type="checkbox"
                  name="activities"
                  value={a}
                  checked={on}
                  disabled={!on && plays.length >= 3}
                  onChange={() =>
                    setPlays((list) => (on ? list.filter((x) => x !== a) : [...list, a]))
                  }
                />
                {a}
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className={styles.recruitToggle}>
        <input type="checkbox" name="recruiting" defaultChecked={recruiting} />
        <span>
          <strong>Taking join requests</strong>
          <small>Public teams only. Turn it off while your roster is full.</small>
        </span>
      </label>
    </div>
  );
}
