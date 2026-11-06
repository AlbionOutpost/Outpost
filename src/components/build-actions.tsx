"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "./build-region-link";
import { useOutpostRegion } from "./region-context";
import { PanelHead } from "./panel-head";
import { WellSelect } from "./well-select";
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
  const region = useOutpostRegion();
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(String(revisions[0] || 1));
  const [busy, setBusy] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const older = revisions.filter((n) => n !== version);
  const effective = older.includes(Number(revision)) ? revision : String(older[0] ?? revision);
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
            ? JSON.stringify({ revision: Number(effective), version })
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
    <section className="panel build-revisions-panel" aria-labelledby="build-revisions-heading">
      <PanelHead
        id="build-revisions-heading"
        title={owner ? "Revisions" : "Make a copy"}
        line={
          owner
            ? `Revision ${version} is current. Restoring an older one saves it as a new revision.`
            : "Copy this build to your account and change it in the editor."
        }
      />
      <div className="build-revisions-actions">
        <button className="button secondary" disabled={busy} onClick={() => run("duplicate")}>
          Duplicate build
        </button>
        {owner && older.length > 0 && (
          <>
            <label>
              <span>Revision to restore</span>
              <WellSelect
                aria-label="Revision to restore"
                value={effective}
                onChange={(e) => setRevision(e.target.value)}
              >
                {older.map((n) => (
                  <option key={n} value={n}>
                    Revision {n}
                  </option>
                ))}
              </WellSelect>
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
        {owner && !older.length && <p className="detail-muted">No older revision yet.</p>}
      </div>
      <p role="status" className="build-revisions-status">
        {message} {needsAuth && message && <Link href="/signin">Sign in</Link>}
      </p>
    </section>
  );
}
