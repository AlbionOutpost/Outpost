"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "./build-region-link";
import { useAtlasRegion } from "./region-context";
export function BuildActions({
  id,
  version,
  owner,
  revisions,
  compact = false,
}: {
  id: string;
  version: number;
  owner: boolean;
  revisions: number[];
  compact?: boolean;
}) {
  const router = useRouter();
  const region = useAtlasRegion();
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(String(revisions[0] || 1));
  const [busy, setBusy] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  async function run(action: "duplicate" | "restore") {
    if (busy) return;
    setBusy(true);
    setNeedsAuth(false);
    setMessage("");
    try {
      const response = await fetch(`/api/builds/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          action === "restore"
            ? JSON.stringify({ revision: Number(revision), version })
            : undefined,
      });
      const body = await response
        .json()
        .catch(() => ({ error: "The build service is unavailable. Please retry." }));
      if (!response.ok) {
        setNeedsAuth(response.status === 401);
        throw new Error(body.error);
      }
      if (action === "duplicate") router.push(`/builds/${body.id}/edit?region=${region}`);
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
  if (compact)
    return (
      <div className="build-duplicate-control">
        <button className="button primary" disabled={busy} onClick={() => run("duplicate")}>
          {busy ? "Making your copy…" : "Make this build yours"}
        </button>
        {message && (
          <p role="alert">
            {message} {needsAuth && <Link href="/signin">Sign in</Link>}
          </p>
        )}
      </div>
    );
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
