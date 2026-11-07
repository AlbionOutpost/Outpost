"use client";
import { useState } from "react";
import {
  crestColors,
  crestItems,
  resolveCrestColor,
  teamActivities,
  type CrestColor,
} from "@/lib/groups/crest";
import { ItemIcon } from "./item-icon";
import { TeamMark } from "./group-parts";
import styles from "./teams.module.css";

const colourName = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
const groups = [...new Set(crestItems.map(([group]) => group))];

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
  const [item, setItem] = useState(crestItem ?? "");
  const [color, setColor] = useState<CrestColor>(resolveCrestColor(name || "Team", crestColor));
  const [plays, setPlays] = useState<string[]>([...activities]);
  return (
    <div className={styles.identity}>
      <fieldset className={styles.crestPicker}>
        <legend>Crest</legend>
        <div className={styles.crestPreview}>
          <TeamMark name={name || "Team"} crestItem={item} crestColor={color} />
          <p>Pick a shield and an item for your crest, or keep the team&apos;s initials.</p>
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
        <div className={styles.charges} role="radiogroup" aria-label="Crest item">
          <label className={styles.charge} title="Initials">
            <input
              type="radio"
              name="crestItem"
              value=""
              checked={!item}
              onChange={() => setItem("")}
            />
            <b className={styles.chargeInitials} aria-hidden="true">
              Aa
            </b>
            <span className="sr-only">Initials</span>
          </label>
          {groups.map((group) =>
            crestItems
              .filter(([g]) => g === group)
              .map(([, id, label]) => (
                <label key={id} className={styles.charge} title={label}>
                  <input
                    type="radio"
                    name="crestItem"
                    value={id}
                    checked={item === id}
                    onChange={() => setItem(id)}
                  />
                  <ItemIcon id={id} size={40} />
                  <span className="sr-only">{label}</span>
                </label>
              )),
          )}
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
