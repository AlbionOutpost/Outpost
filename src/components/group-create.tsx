"use client";
import { useAtlasRegion } from "./region-context";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function GroupCreate() {
  const router = useRouter();
  const region = useAtlasRegion();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel settings-form support-team-create-form"
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
          setError(e instanceof Error ? e.message : "Could not create group");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Team name
        <input name="name" required minLength={3} maxLength={80} />
      </label>
      <label>
        Workspace address
        <input
          name="slug"
          required
          minLength={3}
          maxLength={60}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="your-team"
        />
      </label>
      <label>
        Description
        <textarea name="description" maxLength={4000} />
      </label>
      <label>
        Team region
        <select name="region" aria-label="Team region" defaultValue={region}>
          <option value="europe">Europe</option>
          <option value="americas">Americas</option>
          <option value="asia">Asia</option>
        </select>
      </label>
      <label>
        Workspace visibility
        <select name="visibility" aria-label="Workspace visibility">
          <option value="PRIVATE">Private</option>
          <option value="PUBLIC">Public</option>
        </select>
      </label>
      <p className="team-create-note">
        Private teams keep their workspace member-only. A public team exposes its profile; shared
        plans still require membership. You become the owner.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
