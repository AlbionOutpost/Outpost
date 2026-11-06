"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Disclosure } from "./disclosure";
import { PanelHead } from "./panel-head";
import { WellSelect } from "./well-select";
import { Field, regionLabel, visibilityLabel } from "./group-parts";
import styles from "./teams.module.css";

/** The team's public face: name, description, region and who can find it. Owners and admins. */
export function GroupProfileEditor({
  group,
}: {
  group: {
    id: string;
    name: string;
    description: string;
    region: string;
    visibility: string;
    updatedAt: string;
  };
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    router = useRouter();
  return (
    <section className={`panel ${styles.panel}`} aria-labelledby="team-profile">
      <PanelHead
        id="team-profile"
        title="Team profile"
        line={`${regionLabel(group.region)} · ${visibilityLabel(group.visibility)}. Public teams show their name and description in the directory.`}
      />
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
          <div className={styles.formGrid}>
            <Field label="Team profile name" wide>
              <input name="name" defaultValue={group.name} minLength={3} maxLength={80} required />
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
