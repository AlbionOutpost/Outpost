"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOutpostRegion } from "./region-context";
import { PanelHead } from "./panel-head";
import { WellSelect } from "./well-select";
import { Field } from "./group-parts";
import styles from "./teams.module.css";

/** Name, address, region and visibility; the creator becomes the owner. */
export function GroupCreate() {
  const router = useRouter();
  const region = useOutpostRegion();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={`panel ${styles.panel}`}
      aria-labelledby="team-create"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        setBusy(true);
        setError("");
        try {
          const response = await fetch("/api/groups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          router.push(`/groups/${result.slug}`);
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not create the team");
        } finally {
          setBusy(false);
        }
      }}
    >
      <PanelHead
        id="team-create"
        title="Your team"
        line="You become its owner. Everything here can change later."
      />
      <div className={styles.formGrid}>
        <Field label="Team name" wide>
          <input
            name="name"
            required
            minLength={3}
            maxLength={80}
            placeholder="Ironbound Company"
          />
        </Field>
        <Field
          label="Workspace address"
          wide
          hint="Lowercase letters, numbers and single hyphens, 3 to 60 characters."
        >
          <span className={styles.prefixed}>
            <span aria-hidden="true">albionoutpost.com/groups/</span>
            <input
              name="slug"
              required
              minLength={3}
              maxLength={60}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="ironbound"
            />
          </span>
        </Field>
        <Field
          label="Description"
          wide
          hint="Shown on the team's page; public teams also show it in the directory."
        >
          <textarea
            name="description"
            maxLength={4000}
            placeholder="Who you are, what you play, when you mass up."
          />
        </Field>
        <Field label="Team region">
          <WellSelect name="region" aria-label="Team region" defaultValue={region}>
            <option value="europe">Europe</option>
            <option value="americas">Americas</option>
            <option value="asia">Asia</option>
          </WellSelect>
        </Field>
        <Field label="Workspace visibility">
          <WellSelect name="visibility" aria-label="Workspace visibility">
            <option value="PRIVATE">Private</option>
            <option value="PUBLIC">Public</option>
          </WellSelect>
        </Field>
      </div>
      <p className={styles.subline}>
        Private teams are invisible to anyone outside them. A public team lists its name and
        description and takes join requests; its plans stay members-only either way.
      </p>
      {error && (
        <p role="alert" className={styles.alert}>
          {error}
        </p>
      )}
      <div className={styles.formActions}>
        <button className="button primary" disabled={busy}>
          {busy ? "Creating…" : "Create workspace"}
        </button>
      </div>
    </form>
  );
}
