"use client";
import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { TeamWalletView } from "@/lib/groups/economy-service";
import { AvatarFrame } from "./avatar-frame";
import { EmptyWell } from "./empty-well";
import { NumberField } from "./number-field";
import { Field } from "./group-parts";
import { PanelHead } from "./panel-head";
import { StatusLine } from "./status-line";
import { WellSelect } from "./well-select";
import { operationKey, signedSilver as signed, silverText } from "./economy-motion";
import { kindLabel, shortTime } from "./team-treasury-hero";
import teams from "./teams.module.css";
import styles from "./team-economy.module.css";

type Member = { userId: string; name: string; avatarFrame?: string | null };
type Mode = "credit" | "debit" | "payout" | "reset";
const modes: { key: Mode; label: string }[] = [
  { key: "credit", label: "Credit" },
  { key: "debit", label: "Debit" },
  { key: "payout", label: "Pay out" },
  { key: "reset", label: "Reset" },
];

/**
 * A member's Team wallet below the Treasury hero (which shows the pot and their balance): their
 * own history. With Manage wallet: every balance, the team ledger and one form to credit,
 * debit, pay out or reset. The Treasury reads the wallet and passes it in; the server
 * re-checks the permission and the balance on every change.
 */
export function TeamWallet({
  groupId,
  members,
  locked,
  view,
  error: loadError,
  refreshing,
  onView,
  onRetry,
}: {
  groupId: string;
  members: Member[];
  /** The owner's plan has lapsed: shared edits are refused, so the form is hidden. */
  locked: boolean;
  view: TeamWalletView | null;
  error: string;
  refreshing: boolean;
  onView: (view: TeamWalletView) => void;
  onRetry: () => void;
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState("pot");
  const [mode, setMode] = useState<Mode>("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [key, setKey] = useState(operationKey);
  // A second click before the first answer lands never sends a second request.
  const sending = useRef(false);
  const manage = !!view?.canManage && !locked;
  const frameOf = (id: string | null) => members.find((m) => m.userId === id)?.avatarFrame;
  const holderName = (id: string) =>
    id === "pot"
      ? "Team pot"
      : view?.members?.find((m) => m.userId === id)?.name ||
        members.find((m) => m.userId === id)?.name ||
        "Former team member";
  const balanceOf = (id: string) =>
    id === "pot" ? (view?.pot ?? 0) : (view?.members?.find((m) => m.userId === id)?.balance ?? 0);
  const whole = /^\d+$/.test(amount.trim()) ? Number(amount.trim()) : NaN;
  const needsAmount = mode === "credit" || mode === "debit";
  const amountOk = mode === "reset" || (mode === "payout" && !amount.trim()) || whole >= 1;
  const reasonOk = !needsAmount || reason.trim().length > 0;

  async function book() {
    if (sending.current) return;
    if (!amountOk || !reasonOk) {
      setError("Enter whole silver above zero and a reason.");
      return;
    }
    sending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body: Record<string, unknown> = { action: mode, key, target };
      if (mode !== "reset" && amount.trim()) body.amount = whole;
      if (reason.trim()) body.reason = reason.trim();
      const response = await fetch(`/api/groups/${groupId}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onView(result.wallet);
      setKey(operationKey());
      setAmount("");
      setReason("");
      setMessage(
        `${holderName(target)}: ${modes.find((m) => m.key === mode)!.label.toLowerCase()} recorded.`,
      );
    } catch (e) {
      // The same key is kept, so retrying this exact change can never book it twice.
      setError(e instanceof Error ? e.message : "Could not record this change.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  if (!view)
    return (
      <section className={`${styles.economy} ${teams.panel} panel`} aria-label="Team wallet">
        {loadError ? (
          <>
            <StatusLine tone="error">{loadError}</StatusLine>
            <div className={teams.rowActions}>
              <button type="button" className="pill-link is-small" onClick={onRetry}>
                <RotateCcw size={14} aria-hidden="true" /> Try again
              </button>
            </div>
          </>
        ) : (
          <StatusLine>Loading the team wallet…</StatusLine>
        )}
      </section>
    );

  const ledger = (
    <section className={`panel ${teams.panel}`} aria-labelledby="wallet-ledger">
      <PanelHead
        id="wallet-ledger"
        title={view.canManage ? "Ledger" : "Your history"}
        line={
          view.canManage
            ? "Every change to the team's wallets, latest first (the last 100)."
            : "Every change to your balance, latest first (the last 50)."
        }
        actions={
          <button type="button" className="pill-link is-small" onClick={onRetry}>
            <RotateCcw size={14} aria-hidden="true" /> Refresh
          </button>
        }
      />
      {view.entries.length ? (
        <div className={styles.ledgerWrap}>
          <table className={`well ${teams.table}`}>
            <thead>
              <tr>
                <th scope="col">When</th>
                {view.canManage && (
                  <th scope="col" className={styles.textCol}>
                    Wallet
                  </th>
                )}
                <th scope="col">Change</th>
                <th scope="col" className={styles.reasonCol}>
                  Reason
                </th>
                <th scope="col">By</th>
              </tr>
            </thead>
            <tbody>
              {view.entries.map((e) => (
                <tr key={e.id}>
                  <th scope="row" className={styles.when}>
                    <time dateTime={e.createdAt}>{shortTime(e.createdAt)}</time>
                  </th>
                  {view.canManage && <td className={styles.textCol}>{e.name}</td>}
                  <td className={styles.amount} data-sign={e.amount > 0 ? "+" : "-"}>
                    {signed(e.amount)}
                  </td>
                  <td className={styles.reasonCol}>
                    <span className={styles.kind}>{kindLabel[e.kind] ?? e.kind}</span> {e.reason}
                  </td>
                  <td>{e.by ?? "Former member"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyWell
          emblem="silver-64w"
          title="No silver booked yet"
          line={
            view.canManage
              ? "Credit a member or the pot, or pay a saved loot split into wallets."
              : "Silver an officer books for you, loot rolls you share in and splits you are paid show here."
          }
        />
      )}
    </section>
  );

  return (
    <section className={styles.economy} aria-label="Team wallet">
      {error && (
        <p role="alert" className={teams.alert}>
          {error}
        </p>
      )}
      <p role="status" className={message ? teams.saved : "sr-only"}>
        {message}
      </p>
      {view.canManage && (
        <div className={styles.columns}>
          <section className={`panel ${teams.panel}`} aria-labelledby="wallet-balances">
            <PanelHead
              id="wallet-balances"
              emblem="silver-64w"
              title="Balances"
              line="What the team owes each member, highest first."
            />
            <ul className={teams.list}>
              {[
                { userId: "pot", name: "Team pot", balance: view.pot, member: true },
                ...(view.members ?? []),
              ].map((m) => (
                <li key={m.userId} className={`well ${styles.holder}`}>
                  {m.userId === "pot" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- painted emblem
                    <img src="/albion/icons/team-loot-64w.webp" alt="" />
                  ) : (
                    <AvatarFrame frame={frameOf(m.userId)} size={36} name={m.name} />
                  )}
                  <span className={teams.rowCopy}>
                    <strong>{m.name}</strong>
                    {!m.member && <small>Former member</small>}
                  </span>
                  <span className={styles.amount}>{silverText(m.balance)}</span>
                  {manage && (
                    <button
                      type="button"
                      className="pill-link is-small"
                      aria-label={`Book a change for ${m.name}`}
                      onClick={() => {
                        setTarget(m.userId);
                        document.getElementById("wallet-amount")?.focus();
                      }}
                    >
                      Book
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <div className={styles.stack}>
            {manage && (
              <form
                className={`panel ${teams.panel}`}
                aria-labelledby="wallet-book"
                onSubmit={(e) => {
                  e.preventDefault();
                  void book();
                }}
              >
                <PanelHead
                  id="wallet-book"
                  title="Book a change"
                  line="Credit earnings, debit costs, record a payout made in game, or clear a balance."
                />
                <Field label="Wallet">
                  <WellSelect
                    aria-label="Wallet"
                    value={target}
                    onChange={(e) => {
                      setTarget(e.target.value);
                      setKey(operationKey());
                    }}
                  >
                    <option value="pot">Team pot</option>
                    {(view.members ?? []).map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                        {m.member ? "" : " (former member)"}
                      </option>
                    ))}
                  </WellSelect>
                </Field>
                <div className="segmented" role="group" aria-label="Change">
                  {modes.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      aria-pressed={mode === m.key}
                      onClick={() => {
                        setMode(m.key);
                        setKey(operationKey());
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className={teams.formGrid}>
                  {mode !== "reset" && (
                    <Field
                      label="Silver"
                      hint={
                        mode === "payout"
                          ? `Leave empty to pay out all ${silverText(balanceOf(target))}.`
                          : mode === "debit"
                            ? `Up to ${silverText(balanceOf(target))}.`
                            : undefined
                      }
                    >
                      <NumberField
                        id="wallet-amount"
                        aria-label="Silver"
                        silver
                        min={0}
                        max={1e12}
                        value={amount}
                        placeholder={mode === "payout" ? "All of it" : "e.g. 250k or 1.2m"}
                        onValueChange={(v) => {
                          setAmount(v == null ? "" : String(v));
                          setKey(operationKey());
                        }}
                      />
                    </Field>
                  )}
                  <Field label={needsAmount ? "Reason" : "Reason (optional)"}>
                    <input
                      aria-label="Reason"
                      maxLength={200}
                      value={reason}
                      placeholder={
                        mode === "credit"
                          ? "Ganking share, Avalonian run…"
                          : mode === "debit"
                            ? "Repairs, regear…"
                            : mode === "payout"
                              ? "Paid out in game"
                              : "Balance reset"
                      }
                      onChange={(e) => {
                        setReason(e.target.value);
                        setKey(operationKey());
                      }}
                    />
                  </Field>
                </div>
                {mode === "reset" && (
                  <p className={styles.note}>
                    Sets {holderName(target)} back to zero with one entry of{" "}
                    {signed(-balanceOf(target))} silver. The history stays.
                  </p>
                )}
                <div className={teams.formActions}>
                  <button className="button primary" disabled={busy || !amountOk || !reasonOk}>
                    {busy
                      ? "Recording…"
                      : mode === "reset"
                        ? `Reset ${holderName(target)}`
                        : `${modes.find((m) => m.key === mode)!.label}${whole >= 1 ? ` ${silverText(whole)} silver` : ""}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {ledger}
      {!view.canManage && (
        <p className={styles.note}>
          Officers with Manage wallet book silver here. Ask them to pay out your balance in game.
        </p>
      )}
      {refreshing && <StatusLine>Refreshing…</StatusLine>}
    </section>
  );
}
