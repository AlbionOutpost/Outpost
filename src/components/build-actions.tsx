"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function BuildActions({
  id,
  version,
  owner,
  revisions,
}: {
  id: string;
  version: number;
  owner: boolean;
  revisions: number[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(String(revisions[0] || 1));
  const [busy, setBusy] = useState(false);
  async function run(action: "duplicate" | "restore") {
    setBusy(true);
    try {
      const response = await fetch(`/api/builds/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          action === "restore"
            ? JSON.stringify({ revision: Number(revision), version })
            : undefined,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (action === "duplicate") router.push(`/builds/${body.id}/edit`);
      else {
        setMessage("Selected revision restored as a new version.");
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not complete operation");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel section">
      <div className="actions">
        <button className="button secondary" disabled={busy} onClick={() => run("duplicate")}>
          Duplicate build
        </button>
        {owner && (
          <>
            <label>
              Revision to restore
              <select
                aria-label="Revision to restore"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
              >
                {revisions.map((n) => (
                  <option key={n} value={n}>
                    Revision {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Create a new revision from this older snapshot? Current history and current visibility will be retained.",
                  )
                )
                  run("restore");
              }}
            >
              Restore as new revision
            </button>
          </>
        )}
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
