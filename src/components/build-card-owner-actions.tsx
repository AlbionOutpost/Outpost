"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Copy, Pencil, Trash2 } from "lucide-react";
import Link from "./link";
import { useAtlasRegion } from "./region-context";

/** Presentation only: each mutation rechecks the current server session and build ownership. */
export function BuildCardOwnerActions({ id, title }: { id: string; title: string }) {
  const region = useAtlasRegion(),
    router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [expired, setExpired] = useState(false);
  async function run(action: "duplicate" | "delete") {
    if (busy) return;
    if (
      action === "delete" &&
      !window.confirm(`Delete “${title}” and its revision history? This cannot be undone.`)
    )
      return;
    setBusy(true);
    setError("");
    setExpired(false);
    try {
      const response = await fetch(
        `/api/builds/${encodeURIComponent(id)}${action === "duplicate" ? "/duplicate" : ""}`,
        {
          method: action === "duplicate" ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!response.ok) {
        setExpired(response.status === 401);
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Could not ${action} this build. Please retry.`);
      }
      if (action === "duplicate") {
        const copy = await response.json();
        router.push(`/builds/${encodeURIComponent(copy.id)}/edit?region=${region}`);
      } else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Could not ${action} this build. Please retry.`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="build-card-owner-actions">
      <summary aria-label={`Manage ${title}`} title="Manage your build">
        <MoreHorizontal size={18} />
      </summary>
      <div className="build-owner-menu">
        <Link href={`/builds/${encodeURIComponent(id)}/edit?region=${region}`}>
          <Pencil size={15} />
          Edit details & visibility
        </Link>
        <button type="button" disabled={busy} onClick={() => run("duplicate")}>
          <Copy size={15} />
          Duplicate build
        </button>
        <button
          type="button"
          className="build-delete-action"
          disabled={busy}
          onClick={() => run("delete")}
        >
          <Trash2 size={15} />
          Delete build
        </button>
        {busy && <p role="status">Updating your builds…</p>}
        {error && (
          <p role="alert">
            {error} {expired && <Link href="/signin">Sign in again</Link>}
          </p>
        )}
      </div>
    </details>
  );
}
