"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { decodeActivities } from "@/lib/groups/crest";
import { Disclosure } from "./disclosure";
import { PanelHead } from "./panel-head";
import { WellSelect } from "./well-select";
import { Field, TeamMark, joiningLabel, regionLabel, visibilityLabel } from "./group-parts";
import { TeamIdentityFields, identityFromForm } from "./team-identity-fields";
import styles from "./teams.module.css";

/** The team's public face: crest, name, description, what it plays and who can join. Owners and admins. */
export function GroupProfileEditor({
  group,
}: {
  group: {
    id: string;
    name: string;
    description: string;
    region: string;
    visibility: string;
    crestItem: string | null;
    crestColor: string | null;
    activities: string;
    recruiting: boolean;
    updatedAt: string;
  };
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [name, setName] = useState(group.name),
    router = useRouter();
  const plays = decodeActivities(group.activities);
  return (
    <section className={`panel ${styles.panel}`} aria-labelledby="team-profile">
      <PanelHead
        id="team-profile"
        title="Team profile"
        line="What players see in the directory and on your team page."
      />
      <div className={`well ${styles.profileSummary}`}>
        <TeamMark
          name={group.name}
          crestItem={group.crestItem}
          crestColor={group.crestColor}
          size="medium"
        />
        <span className={styles.rowCopy}>
          <strong>{group.name}</strong>
          <small>
            {regionLabel(group.region)} · {visibilityLabel(group.visibility)} ·{" "}
            {joiningLabel(group)}
          </small>
          <small>{plays.length ? plays.join(" · ") : "Activities not set"}</small>
        </span>
      </div>
      <Disclosure summary="Edit team profile">
        <form
          className={styles.form}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            try {
              const r = await fetch(`/api/groups/${group.id}/actions`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "profile",
                    expectedUpdatedAt: group.updatedAt,
                    name: f.get("name"),
                    description: f.get("description"),
                    region: f.get("region"),
                    visibility: f.get("visibility"),
                    ...identityFromForm(f),
                  }),
                }),
                b = await r.json();
              if (!r.ok) throw new Error(b.error);
              setMessage("Team profile saved.");
              router.refresh();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Save failed; your draft is retained.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className={styles.profileForm}>
            <div className={styles.formGrid}>
              <Field label="Team profile name" wide>
                <input
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={3}
                  maxLength={80}
                  required
                />
              </Field>
              <Field label="Team profile description" wide>
                <textarea name="description" defaultValue={group.description} maxLength={4000} />
              </Field>
              <Field label="Team profile region">
                <WellSelect name="region" defaultValue={group.region}>
                  {["europe", "americas", "asia"].map((r) => (
                    <option key={r} value={r}>
                      {regionLabel(r)}
                    </option>
                  ))}
                </WellSelect>
              </Field>
              <Field label="Team profile visibility">
                <WellSelect name="visibility" defaultValue={group.visibility}>
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </WellSelect>
              </Field>
            </div>
            <TeamIdentityFields
              name={name}
              crestItem={group.crestItem}
              crestColor={group.crestColor}
              activities={plays}
              recruiting={group.recruiting}
            />
          </div>
          <div className={styles.formActions}>
            <button className="button primary" disabled={busy}>
              Save team profile
            </button>
          </div>
          <p role="status" className={message ? styles.saved : "sr-only"}>
            {message}
          </p>
        </form>
      </Disclosure>
    </section>
  );
}
