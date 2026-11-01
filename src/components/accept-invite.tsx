"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AcceptInvite({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
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
        Accept invitation
      </button>
      {message && <p role="alert">{message}</p>}
    </>
  );
}
