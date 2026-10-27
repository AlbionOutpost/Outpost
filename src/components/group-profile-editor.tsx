"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <details className="panel section">
      <summary>Edit group profile</summary>
      <form
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
            setMessage("Group profile saved.");
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Save failed; your draft is retained.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Group profile name
          <input name="name" defaultValue={group.name} minLength={3} maxLength={80} required />
        </label>
        <label>
          Group profile description
          <textarea name="description" defaultValue={group.description} maxLength={4000} />
        </label>
        <label>
          Group profile region
          <select name="region" defaultValue={group.region}>
            {["europe", "americas", "asia"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          Group profile visibility
          <select name="visibility" defaultValue={group.visibility}>
            <option>PUBLIC</option>
            <option>PRIVATE</option>
          </select>
        </label>
        <button className="button primary" disabled={busy}>
          Save group profile
        </button>
      </form>
      <p role="status">{message}</p>
    </details>
  );
}
