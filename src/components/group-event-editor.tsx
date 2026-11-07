"use client";
import { EditorDialog } from "./editor-dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "./group-parts";
import styles from "./teams.module.css";
import { NumberField } from "./number-field";
export function GroupEventEditor({
  groupId,
  event,
}: {
  groupId: string;
  event: {
    id: string;
    version: number;
    title: string;
    description: string;
    startsAt: string;
    timezone: string;
    voiceInfo: string;
    expectedParticipants: number;
    compositionId: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    router = useRouter();
  const local = new Date(
    new Date(event.startsAt).getTime() - new Date(event.startsAt).getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);
  return (
    <>
      <button type="button" className="pill-link is-small" onClick={() => setOpen(true)}>
        Edit event
      </button>
      <EditorDialog
        open={open}
        title="Edit team event"
        onClose={() => setOpen(false)}
        className={styles.dialog}
      >
        <form
          className={styles.form}
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            try {
              const r = await fetch(`/api/groups/${groupId}/actions`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "edit-event",
                    eventId: event.id,
                    version: event.version,
                    title: f.get("title"),
                    description: f.get("description"),
                    startsAt: new Date(String(f.get("startsAt"))).toISOString(),
                    timezone: f.get("timezone"),
                    expectedParticipants: Number(f.get("expectedParticipants")),
                    voiceInfo: f.get("voiceInfo"),
                    compositionId: event.compositionId,
                  }),
                }),
                b = await r.json();
              if (!r.ok) throw new Error(b.error);
              setMessage("Event revision saved.");
              setOpen(false);
              router.refresh();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Event save failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className={styles.formGrid}>
            <Field label="Edit event title" wide>
              <input
                name="title"
                required
                minLength={3}
                maxLength={100}
                defaultValue={event.title}
              />
            </Field>
            <Field label="Edit event start (your device local time)">
              <input name="startsAt" type="datetime-local" required defaultValue={local} />
            </Field>
            <Field label="Edit event display timezone">
              <input name="timezone" required defaultValue={event.timezone} />
            </Field>
            <Field label="Edit event participant count">
              <NumberField
                name="expectedParticipants"
                min={1}
                max={400}
                defaultValue={event.expectedParticipants}
              />
            </Field>
            <Field label="Edit event voice information">
              <input name="voiceInfo" maxLength={200} defaultValue={event.voiceInfo} />
            </Field>
            <Field label="Edit event description" wide>
              <textarea name="description" maxLength={4000} defaultValue={event.description} />
            </Field>
          </div>
          <div className={styles.formActions}>
            <button type="button" className="button secondary" onClick={() => setOpen(false)}>
              Not now
            </button>
            <button className="button primary" disabled={busy}>
              Save event revision
            </button>
          </div>
          <p role="status" className={message ? styles.saved : "sr-only"}>
            {message}
          </p>
        </form>
      </EditorDialog>
    </>
  );
}
