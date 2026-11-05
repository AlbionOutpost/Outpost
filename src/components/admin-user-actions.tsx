"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EditorDialog } from "./editor-dialog";
import { ShieldBan, Gift, KeyRound } from "lucide-react";
async function change(url: string, value: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "The change could not be saved.");
}
function BanForm({
  discordId,
  version,
  active,
  onSaved,
}: {
  discordId?: string;
  version?: number;
  active?: boolean;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [id, setId] = useState(discordId || "");
  const [lookup, setLookup] = useState<{ version: number; active: boolean } | null>(
    discordId ? { version: version || 0, active: !!active } : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const unban = lookup?.active,
    word = unban ? "UNBAN" : "BAN";
  async function inspect() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/bans?discordId=" + encodeURIComponent(id), {
        cache: "no-store",
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setLookup({
        version: data.ban?.version || 0,
        active:
          !!data.ban &&
          !data.ban.revokedAt &&
          (!data.ban.expiresAt || Date.parse(data.ban.expiresAt) > Date.now()),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!lookup) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await change("/api/admin/bans", {
        discordId: id,
        action: unban ? "unban" : "ban",
        days: Number(f.get("days") || 0),
        version: lookup.version,
        reason: f.get("reason"),
        confirmation: f.get("confirmation"),
      });
      setDone(true);
      router.refresh();
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-action-form">
      <label>
        Discord user ID
        <input
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setLookup(null);
          }}
          readOnly={!!discordId}
          inputMode="numeric"
          maxLength={20}
          pattern="[0-9]{17,20}"
        />
      </label>
      {!lookup && (
        <button
          className="button secondary"
          disabled={busy || !/^\d{17,20}$/.test(id)}
          onClick={inspect}
        >
          {busy ? "Checking…" : "Check Discord ID"}
        </button>
      )}
      {lookup && !done && (
        <form onSubmit={submit}>
          <p>
            {unban
              ? "Unbanning permits a new sign-in. Previously revoked sessions stay closed."
              : "Banning revokes active sessions and prevents this Discord account from signing in to Outpost. It does not delete content or cancel a paid subscription."}
          </p>
          {!unban && (
            <label>
              Ban duration
              <select name="days" defaultValue="7">
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="0">Until revoked</option>
              </select>
            </label>
          )}
          <label>
            Reason
            <textarea name="reason" minLength={5} maxLength={500} required rows={3} />
          </label>
          <label>
            Type{" "}
            <code>
              {word} {id}
            </code>{" "}
            to confirm
            <input name="confirmation" required autoComplete="off" />
          </label>
          <button className={`button ${unban ? "secondary" : "admin-danger"}`} disabled={busy}>
            {busy ? "Saving…" : unban ? "Restore Outpost access" : "Ban on Outpost"}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {done && <p role="status">Access updated.</p>}
    </div>
  );
}
export function AdminDiscordBan() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="button secondary" onClick={() => setOpen(true)}>
        <ShieldBan size={17} />
        Ban a Discord ID
      </button>
      <EditorDialog open={open} title="Manage Discord access" onClose={() => setOpen(false)}>
        <BanForm onSaved={() => setOpen(false)} />
      </EditorDialog>
    </>
  );
}
export function AdminUserActions({
  id,
  updatedAt,
  discordId,
  banVersion,
  banActive,
  protectedAccount,
  hasGift,
}: {
  id: string;
  updatedAt: string;
  discordId?: string;
  banVersion: number;
  banActive: boolean;
  protectedAccount: boolean;
  hasGift: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [banOpen, setBanOpen] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      action =
        (e.nativeEvent as SubmitEvent).submitter instanceof HTMLButtonElement
          ? ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement).value ||
            String(f.get("action"))
          : String(f.get("action"));
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await change(`/api/admin/users/${id}`, {
        action,
        reason: f.get("reason"),
        expectedUpdatedAt: updatedAt,
        ...(action === "grant" ? { days: Number(f.get("days")) } : {}),
      });
      setMessage(
        action === "grant"
          ? "Supporter gift saved."
          : action === "revoke-gift"
            ? "Gift revoked. Paid subscription benefits are unchanged."
            : "Sessions revoked. A new sign-in is required.",
      );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="admin-surface">
        <h2>
          <Gift size={20} />
          Supporter gift
        </h2>
        <p>
          Grant premium benefits without creating a payment or changing Stripe. A revoked gift
          leaves any paid subscription intact.
        </p>
        <form onSubmit={submit} className="admin-action-form">
          <label>
            Gift duration
            <select name="days" defaultValue="30">
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">One year</option>
              <option value="0">Until revoked</option>
            </select>
          </label>
          <label>
            Reason for this change
            <textarea name="reason" required minLength={5} maxLength={500} rows={2} />
          </label>
          <div className="admin-action-buttons">
            <button name="action" value="grant" className="button primary" disabled={busy}>
              {busy ? "Saving…" : "Grant Supporter"}
            </button>
            {hasGift && (
              <button
                name="action"
                value="revoke-gift"
                className="button secondary"
                disabled={busy}
              >
                Revoke gift
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="admin-surface">
        <h2>
          <KeyRound size={20} />
          Account security
        </h2>
        <p>
          Close this account’s sessions, or review its Discord access. Bans retain content and are
          recorded in the audit trail.
        </p>
        <form onSubmit={submit} className="admin-action-form">
          <input type="hidden" name="action" value="revoke-sessions" />
          <label>
            Reason for revoking sessions
            <textarea name="reason" required minLength={5} maxLength={500} rows={2} />
          </label>
          <button className="button secondary" disabled={busy || protectedAccount}>
            Revoke sessions
          </button>
        </form>
        {discordId && !protectedAccount && (
          <button className="button admin-danger" onClick={() => setBanOpen(true)}>
            {banActive ? "Review / remove ban" : "Ban on Outpost"}
          </button>
        )}
        {protectedAccount && (
          <p className="muted">
            Administrator accounts are protected from bans and session revocation here.
          </p>
        )}
      </section>
      <div aria-live="polite">
        {message && (
          <p role="status" className="admin-success">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
      <EditorDialog open={banOpen} title="Manage Discord access" onClose={() => setBanOpen(false)}>
        <BanForm
          discordId={discordId}
          version={banVersion}
          active={banActive}
          onSaved={() => setBanOpen(false)}
        />
      </EditorDialog>
    </>
  );
}
