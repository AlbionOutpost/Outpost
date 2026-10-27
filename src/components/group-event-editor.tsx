"use client";
import { EditorDialog } from "./editor-dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
      <button type="button" className="button secondary" onClick={() => setOpen(true)}>
        Edit event
      </button>
      <EditorDialog open={open} title="Edit guild event" onClose={() => setOpen(false)}>
        <form
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
          <label>
            Edit event title
            <input name="title" required minLength={3} maxLength={100} defaultValue={event.title} />
          </label>
          <label>
            Edit event description
            <textarea name="description" maxLength={4000} defaultValue={event.description} />
          </label>
          <label>
            Edit event start (your device local time)
            <input name="startsAt" type="datetime-local" required defaultValue={local} />
          </label>
          <label>
            Edit event display timezone
            <input name="timezone" required defaultValue={event.timezone} />
          </label>
          <label>
            Edit event participant count
            <input
              name="expectedParticipants"
              type="number"
              min={1}
              max={400}
              defaultValue={event.expectedParticipants}
            />
          </label>
          <label>
            Edit event voice information
            <input name="voiceInfo" maxLength={200} defaultValue={event.voiceInfo} />
          </label>
          <button className="button secondary" disabled={busy}>
            Save event revision
          </button>
        </form>
        <p role="status">{message}</p>
      </EditorDialog>
    </>
  );
}
