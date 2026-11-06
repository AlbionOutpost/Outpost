"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./teams.module.css";

/** Accepts a team invitation; the server checks the link and the signed-in account again. */
export function AcceptInvite({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
      {message && (
        <p role="alert" className={`${styles.alert} ${styles.fullRow}`}>
          {message}
        </p>
      )}
      <button
        className="button primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const response = await fetch(`/api/invitations/${token}`, { method: "POST" });
            const body = await response.json();
            if (!response.ok) throw new Error(body.error);
            router.push(`/groups/${body.slug}`);
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Could not accept invitation");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Joining…" : "Accept invitation"}
      </button>
    </>
  );
}
