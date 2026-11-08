"use client";
import { useEffect, useState } from "react";
import {
  allocateLoot,
  lootConfiguration,
  type LootConfiguration,
  type LootExpense,
} from "@/lib/groups/loot";
import { accountLogoutEvent } from "@/lib/account-build-drafts";
import { Download, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { StatusLine } from "./status-line";
import { WellSelect } from "./well-select";
import { Disclosure } from "./disclosure";
import { Field } from "./group-parts";
import { EditorDialog } from "./editor-dialog";
// Small (CSS only) and imported here so the reveal opens with its stage already in place.
import { LootChestReveal, type RevealPayout } from "./economy-stage";
import { bookkeepingLine } from "@/lib/groups/economy";
import { walletChangedEvent } from "./economy-motion";
import styles from "./teams.module.css";
import { NumberField } from "./number-field";

/** Fired by the Treasury's New split button. */
export const newLootSplitEvent = "outpost:team-loot-new";

type Saved = {
  id: string;
  title: string;
  version: number;
  configuration: unknown;
  updatedAt: string;
};
export function TeamLootWorkspace({
  groupId,
  userId,
  members,
  editable,
  canPay = false,
  guildTaxPercent = 0,
  canSetTax = false,
  active,
}: {
  groupId: string;
  userId: string;
  members: { userId: string; name: string; avatarFrame?: string | null }[];
  editable: boolean;
  /** Manage wallet: a saved split can be paid into the participants' wallets once. */
  canPay?: boolean;
  /** The team's guild tax rate (Settings). */
  guildTaxPercent?: number;
  /** Manage team: with no rate set yet, it can be set right here. */
  canSetTax?: boolean;
  active: boolean;
}) {
  // Empty fields with hints, not sample values: the pool reads as missing until it is entered.
  const initial: LootConfiguration = {
    pool: NaN,
    notes: "",
    guildTaxPercent: 0,
    expenses: [],
    participants: [{ userId, shares: 1 }],
  };
  const [configuration, setConfiguration] = useState(initial),
    [title, setTitle] = useState(""),
    [checked, setChecked] = useState(false),
    [selected, setSelected] = useState<Saved | null>(null);
  // The team's rate as this split sees it; setting it here takes effect without a reload.
  const [rate, setRate] = useState(guildTaxPercent),
    [rateDraft, setRateDraft] = useState<number | null>(null),
    [rateMessage, setRateMessage] = useState(""),
    [rateBusy, setRateBusy] = useState(false);
  // A new rate from Settings (after a refresh) replaces the one seen here.
  const [rateProp, setRateProp] = useState(guildTaxPercent);
  if (rateProp !== guildTaxPercent) {
    setRateProp(guildTaxPercent);
    setRate(guildTaxPercent);
  }
  const saveRate = async () => {
    if (rateDraft === null || rateDraft <= 0) {
      setRateMessage("Enter a rate above 0%.");
      return;
    }
    setRateBusy(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "guild-tax", guildTaxPercent: rateDraft }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "The rate was not saved.");
      setRate(rateDraft);
      setConfiguration((c) => ({ ...c, guildTaxPercent: rateDraft }));
      setRateMessage("");
    } catch (error) {
      setRateMessage(error instanceof Error ? error.message : "The rate was not saved.");
    } finally {
      setRateBusy(false);
    }
  };
  const [saved, setSaved] = useState<Saved[]>([]),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [paid, setPaid] = useState<Set<string> | null>(null);
  const [reveal, setReveal] = useState<{
    rows: RevealPayout[];
    total: number;
    paid: boolean;
  } | null>(null);
  const [baseline, setBaseline] = useState(JSON.stringify({ title: "", configuration: initial }));
  const dirty = JSON.stringify({ title, configuration }) !== baseline;
  const parsed = lootConfiguration.safeParse(configuration),
    result = parsed.success ? allocateLoot(parsed.data) : null;
  useEffect(() => {
    if (!active || loaded) return;
    const controller = new AbortController();
    fetch(`/api/groups/${groupId}/loot`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setSaved(body);
        setLoaded(true);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Saved splits could not be loaded.");
      });
    return () => controller.abort();
  }, [active, loaded, groupId, loadAttempt]);
  // Which saved splits are already in wallets, for members who can pay them in.
  useEffect(() => {
    if (!active || !canPay || paid) return;
    const controller = new AbortController();
    fetch(`/api/groups/${groupId}/wallet`, { signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((body) => body && setPaid(new Set(body.wallet.paidSplits)))
      .catch(() => {});
    return () => controller.abort();
  }, [active, canPay, paid, groupId]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const logout = (event: Event) => {
      if (
        !confirm(
          "Sign out and discard your unsaved loot split? Save or export JSON first to keep it.",
        )
      )
        event.preventDefault();
    };
    const follow = (event: MouseEvent) => {
      const link =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (
        !link ||
        event.button ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      )
        return;
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin && url.pathname === location.pathname) return;
      if (!confirm("Leave this unsaved loot split? Save or export JSON first to keep it.")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", follow, true);
    window.addEventListener(accountLogoutEvent, logout);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", follow, true);
      window.removeEventListener(accountLogoutEvent, logout);
    };
  }, [dirty]);
  useEffect(() => {
    const start = () => open(null);
    window.addEventListener(newLootSplitEvent, start);
    return () => window.removeEventListener(newLootSplitEvent, start);
  });
  function open(row: Saved | null) {
    if (dirty && !confirm("Replace your unsaved loot split? Export JSON first to keep it.")) return;
    const value = row
      ? lootConfiguration.safeParse(row.configuration)
      : { success: true as const, data: initial };
    if (!value.success) {
      setError("This saved split could not be opened. Its data has been kept.");
      return;
    }
    const nextTitle = row?.title || "";
    setConfiguration(value.data);
    setTitle(nextTitle);
    setSelected(row);
    setBaseline(JSON.stringify({ title: nextTitle, configuration: value.data }));
    setChecked(false);
    setError("");
    setMessage("");
  }
  // Each field says what it is missing, once the player tries to save.
  const missing = {
    title: title.trim().length < 3 ? "Name the split (3–100 characters)." : "",
    pool: !Number.isFinite(configuration.pool) ? "Enter the loot pool." : "",
    expenses: configuration.expenses.map((row) => ({
      label: row.label.trim() ? "" : "Name the expense.",
      amount:
        (row.kind ?? "silver") === "percent"
          ? row.percent == null || !Number.isFinite(row.percent)
            ? "Enter the percentage."
            : ""
          : !Number.isFinite(row.silver)
            ? "Enter the silver."
            : "",
    })),
    shares: configuration.participants.map((row) =>
      Number.isFinite(row.shares) ? "" : "Enter the shares.",
    ),
  };
  const shown = (text: string) => (checked ? text : undefined);
  const setExpense = (i: number, patch: Partial<LootExpense>) =>
    setConfiguration({
      ...configuration,
      expenses: configuration.expenses.map((row, j) => (j === i ? { ...row, ...patch } : row)),
    });
  async function save() {
    setChecked(true);
    if (!parsed.success || title.trim().length < 3 || title.trim().length > 100) {
      setError(
        "Fill in the fields marked below. Guild tax and expenses must fit in the pool, and every participant must be in the team.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/groups/${groupId}/loot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          configuration,
          ...(selected ? { id: selected.id, version: selected.version } : {}),
        }),
      });
      const row = await response.json();
      if (!response.ok) throw new Error(row.error);
      setSelected(row);
      setSaved((rows) => [row, ...rows.filter((r) => r.id !== row.id)].slice(0, 50));
      setBaseline(JSON.stringify({ title, configuration }));
      setMessage(`Loot split saved · revision ${row.version}. No in-game silver was transferred.`);
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : "Could not save this split."} Your draft is retained; export JSON for a backup.`,
      );
    } finally {
      setBusy(false);
    }
  }
  function exportDraft() {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify({ title, configuration, version: selected?.version }, null, 2)], {
          type: "application/json",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "outpost-team-loot.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const name = (id: string) => members.find((m) => m.userId === id)?.name || "Former team member";
  const revealRows = (
    payouts: { userId: string; silver: number; shares?: number }[],
  ): RevealPayout[] =>
    payouts.map((p) => ({
      userId: p.userId,
      name: name(p.userId),
      frame: members.find((m) => m.userId === p.userId)?.avatarFrame,
      silver: p.silver,
      note: p.shares ? `${p.shares} ${p.shares === 1 ? "share" : "shares"}` : undefined,
    }));
  async function payIntoWallets() {
    if (!selected) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/groups/${groupId}/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay-split", splitId: selected.id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setPaid(new Set(body.wallet.paidSplits));
      window.dispatchEvent(new Event(walletChangedEvent));
      const rows = body.paid as { userId: string; silver: number }[];
      const shares = new Map(result?.payouts.map((p) => [p.userId, p.shares]));
      setReveal({
        rows: revealRows(rows.map((r) => ({ ...r, shares: shares.get(r.userId) }))),
        total: rows.reduce((t, r) => t + r.silver, 0),
        paid: true,
      });
      setMessage(
        `Paid into wallets${body.guildTax ? `, and ${silver(body.guildTax)} of guild tax into the team pot` : ""}. Hand the silver over in game, then record payouts in Wallet.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not pay this split into wallets.");
    } finally {
      setBusy(false);
    }
  }
  const silver = (n: number) => `${n.toLocaleString("en")} silver`;
  return (
    <section className={`team-loot-workspace ${styles.loot}`} aria-label="Team loot splits">
      {error && (
        <p role="alert" className={styles.alert}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={styles.saved}>
          {message}
        </p>
      )}
      <div className={styles.lootColumns}>
        <aside className={`panel ${styles.panel}`} aria-labelledby="team-loot-saved">
          <PanelHead
            id="team-loot-saved"
            title="Saved splits"
            line="The latest 50, for current members."
          />
          <div className={styles.rowActions}>
            <button
              type="button"
              className="pill-link is-small"
              onClick={() => {
                setLoaded(false);
                setError("");
                setLoadAttempt((attempt) => attempt + 1);
              }}
            >
              <RotateCcw size={14} aria-hidden="true" /> Refresh saved splits
            </button>
          </div>
          {saved.length > 0 && (
            <ul className={styles.list}>
              {saved.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`well ${styles.wellRow}`}
                    aria-pressed={selected?.id === row.id}
                    onClick={() => open(row)}
                  >
                    <span className={styles.rowCopy}>
                      <strong>{row.title}</strong>
                      <small>Revision {row.version}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loaded && !error && active && <StatusLine>Loading saved splits…</StatusLine>}
          {loaded && !saved.length && (
            <EmptyWell
              emblem="team-loot"
              title="No saved splits yet"
              line={
                editable
                  ? "Fill in the split and save it to keep a record."
                  : "Members with Manage loot splits save splits here."
              }
              action={
                editable ? (
                  <button type="button" className="button secondary" onClick={() => open(null)}>
                    New split
                  </button>
                ) : undefined
              }
            />
          )}
        </aside>
        <fieldset disabled={!editable || busy} className={`panel ${styles.panel}`}>
          <legend className="sr-only">Split inputs</legend>
          <PanelHead
            title="The haul"
            line="Record the pool, repay the costs, share the rest."
            actions={
              <button type="button" className="pill-link is-small" onClick={exportDraft}>
                <Download size={14} aria-hidden="true" /> Export JSON
              </button>
            }
          />
          <div className={styles.formGrid}>
            <Field label="Split name" error={shown(missing.title)}>
              <input
                id="loot-split-name"
                aria-label="Split name"
                maxLength={100}
                placeholder="e.g. Tuesday ZvZ haul"
                aria-invalid={checked && !!missing.title ? true : undefined}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field
              label="Total loot pool (silver)"
              hint="Type 12m, 500k or the full number."
              error={shown(missing.pool)}
            >
              <NumberField
                aria-label="Total loot pool (silver)"
                silver
                required
                min={0}
                max={Number.MAX_SAFE_INTEGER}
                placeholder="e.g. 12m"
                aria-invalid={checked && !!missing.pool ? true : undefined}
                value={configuration.pool}
                onValueChange={(v) => setConfiguration({ ...configuration, pool: v ?? NaN })}
              />
            </Field>
          </div>
          {rate > 0 || configuration.guildTaxPercent ? (
            <label className={`well ${styles.taxToggle}`}>
              <input
                type="checkbox"
                aria-describedby="loot-guild-tax-line"
                checked={!!configuration.guildTaxPercent}
                onChange={(e) =>
                  setConfiguration({
                    ...configuration,
                    guildTaxPercent: e.target.checked ? rate : 0,
                  })
                }
              />
              <span className={styles.rowCopy}>
                <strong>Guild tax</strong>
                <small id="loot-guild-tax-line">
                  {configuration.guildTaxPercent &&
                  Math.abs(configuration.guildTaxPercent - rate) > 1e-9
                    ? `Saved at ${configuration.guildTaxPercent}%; the team's rate is now ${rate}%. Turn it off and on to use the new rate.`
                    : `${rate}% of the pool goes to the team pot before the share.`}
                </small>
              </span>
            </label>
          ) : canSetTax && editable ? (
            <div className={`well ${styles.taxSetup}`}>
              <span className={styles.rowCopy}>
                <strong>Guild tax</strong>
                <small id="loot-guild-tax-setup">
                  Set the team&apos;s rate to take a share of the pool for the team pot first. It is
                  saved for every split; change it later in Settings.
                </small>
              </span>
              <div className={styles.taxSetupRow}>
                <NumberField
                  aria-label="Team guild tax (%)"
                  aria-describedby="loot-guild-tax-setup"
                  min={0}
                  max={100}
                  decimals={1}
                  placeholder="e.g. 10"
                  value={rateDraft}
                  onValueChange={setRateDraft}
                />
                <button
                  type="button"
                  className="button secondary"
                  disabled={rateBusy}
                  onClick={saveRate}
                >
                  Set guild tax
                </button>
              </div>
              {rateMessage && (
                <p role="alert" className={styles.subline}>
                  {rateMessage}
                </p>
              )}
            </div>
          ) : (
            <p className={styles.subline}>
              No guild tax is set for this team. Members with Manage team set it in Settings.
            </p>
          )}
          <h3 className={styles.subhead}>Expenses</h3>
          <p className={styles.subline}>
            Repairs, food and other costs paid back in silver, or a percentage of the pool (a
            caller&apos;s or scout&apos;s cut), taken before the share.
          </p>
          {configuration.expenses.map((expense, i) => {
            const percent = (expense.kind ?? "silver") === "percent";
            return (
              <div className={`well ${styles.lootRow} ${styles.expenseRow}`} key={i}>
                <Field label={`Expense ${i + 1}`} error={shown(missing.expenses[i]?.label)}>
                  <input
                    aria-label={`Expense ${i + 1} description`}
                    maxLength={100}
                    placeholder="e.g. Repairs"
                    aria-invalid={checked && !!missing.expenses[i]?.label ? true : undefined}
                    value={expense.label}
                    onChange={(e) => setExpense(i, { label: e.target.value })}
                  />
                </Field>
                <div
                  className={`segmented ${styles.kindToggle}`}
                  role="group"
                  aria-label={`Expense ${i + 1} in`}
                >
                  {(
                    [
                      ["silver", "Silver"],
                      ["percent", "%"],
                    ] as const
                  ).map(([kind, label]) => (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={(expense.kind ?? "silver") === kind}
                      onClick={() =>
                        setExpense(
                          i,
                          kind === "percent"
                            ? { kind, silver: 0, percent: undefined }
                            : { kind, silver: NaN, percent: undefined },
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Field
                  label={percent ? "% of pool" : "Silver"}
                  error={shown(missing.expenses[i]?.amount)}
                >
                  {percent ? (
                    <NumberField
                      key="percent"
                      aria-label={`Expense ${i + 1} percent`}
                      required
                      min={0}
                      max={100}
                      decimals={1}
                      placeholder="e.g. 5"
                      value={expense.percent ?? null}
                      onValueChange={(v) => setExpense(i, { percent: v ?? undefined })}
                    />
                  ) : (
                    <NumberField
                      key="silver"
                      aria-label={`Expense ${i + 1} silver`}
                      silver
                      required
                      min={0}
                      max={Number.MAX_SAFE_INTEGER}
                      placeholder="e.g. 250k"
                      value={expense.silver}
                      onValueChange={(v) => setExpense(i, { silver: v ?? NaN })}
                    />
                  )}
                </Field>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Remove expense ${i + 1}`}
                  onClick={() =>
                    setConfiguration({
                      ...configuration,
                      expenses: configuration.expenses.filter((_, j) => j !== i),
                    })
                  }
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            );
          })}
          <div className={styles.rowActions}>
            <button
              type="button"
              className="button secondary"
              disabled={configuration.expenses.length >= 50}
              onClick={() =>
                setConfiguration({
                  ...configuration,
                  expenses: [...configuration.expenses, { label: "", kind: "silver", silver: NaN }],
                })
              }
            >
              <Plus size={16} aria-hidden="true" /> Add expense
            </button>
          </div>
          <h3 className={styles.subhead}>Participants &amp; shares</h3>
          <p className={styles.subline}>
            One share each splits evenly; give more shares for an agreed bigger cut.
          </p>
          {configuration.participants.map((participant, i) => (
            <div className={`well ${styles.lootRow}`} key={participant.userId}>
              <span className={styles.rowCopy}>
                <strong>{name(participant.userId)}</strong>
              </span>
              <Field label="Shares" error={shown(missing.shares[i])}>
                <NumberField
                  required
                  aria-label={`Shares for ${members.find((m) => m.userId === participant.userId)?.name || participant.userId}`}
                  min={1}
                  max={1000}
                  value={participant.shares}
                  onValueChange={(v) =>
                    setConfiguration({
                      ...configuration,
                      participants: configuration.participants.map((row, j) =>
                        j === i ? { ...row, shares: v ?? NaN } : row,
                      ),
                    })
                  }
                />
              </Field>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Remove participant ${i + 1}`}
                onClick={() =>
                  setConfiguration({
                    ...configuration,
                    participants: configuration.participants.filter((_, j) => j !== i),
                  })
                }
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
          <Field label="Add participant">
            <WellSelect
              aria-label="Add loot participant"
              value=""
              disabled={configuration.participants.length >= 400}
              onChange={(e) => {
                if (e.target.value)
                  setConfiguration({
                    ...configuration,
                    participants: [
                      ...configuration.participants,
                      { userId: e.target.value, shares: 1 },
                    ],
                  });
              }}
            >
              <option value="">Choose a team member</option>
              {members
                .filter((m) => !configuration.participants.some((p) => p.userId === m.userId))
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
            </WellSelect>
          </Field>
          <Field label="Split notes">
            <textarea
              maxLength={2000}
              value={configuration.notes}
              onChange={(e) => setConfiguration({ ...configuration, notes: e.target.value })}
            />
          </Field>
        </fieldset>
        <section className={`panel ${styles.panel}`} aria-label="Loot payout preview">
          <PanelHead
            title="Payout"
            line="A record for the team; Outpost moves no silver in game."
          />
          {result ? (
            <>
              <dl className={styles.facts} data-count={result.guildTax ? 4 : 3}>
                <div>
                  <dt>Loot pool</dt>
                  <dd>{silver(result.pool)}</dd>
                </div>
                {result.guildTax > 0 && (
                  <div>
                    <dt>Guild tax · {result.guildTaxPercent}%</dt>
                    <dd>{silver(result.guildTax)}</dd>
                  </div>
                )}
                <div>
                  <dt>Expenses</dt>
                  <dd>{silver(result.expenses)}</dd>
                </div>
                <div className={styles.factLead}>
                  <dt>Shared payout</dt>
                  <dd>{silver(result.net)}</dd>
                </div>
              </dl>
              {(result.guildTax > 0 || result.expenseRows.length > 0) && (
                <ul className={`well ${styles.breakdown}`} aria-label="Taken before the share">
                  {result.guildTax > 0 && (
                    <li>
                      <span>
                        Guild tax <small>{result.guildTaxPercent}% · to the team pot</small>
                      </span>
                      <span data-number="">−{silver(result.guildTax)}</span>
                    </li>
                  )}
                  {result.expenseRows.map((row, i) => (
                    <li key={i}>
                      <span>
                        {row.label}
                        {row.percent !== null && <small>{row.percent}% of the pool</small>}
                      </span>
                      <span data-number="">−{silver(row.silver)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <table className={`well ${styles.table}`}>
                <thead>
                  <tr>
                    <th scope="col">Participant</th>
                    <th scope="col">Shares</th>
                    <th scope="col">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {result.payouts.map((row) => (
                    <tr key={row.userId}>
                      <th scope="row">{name(row.userId)}</th>
                      <td>{row.shares}</td>
                      <td>
                        {silver(row.silver)}
                        {row.roundingSilver > 0 && <small>+1 rounding</small>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.roundingSilver > 0 && (
                <Disclosure summary="How rounding works">
                  <p className={styles.subline}>
                    {result.roundingSilver} leftover silver goes one each to the largest fractional
                    shares; ties go by member ID. Nothing is left unallocated.
                  </p>
                </Disclosure>
              )}
            </>
          ) : (
            <StatusLine>
              Enter the pool and each amount, and add at least one participant. Guild tax and
              expenses must fit in the pool.
            </StatusLine>
          )}
          <div className={styles.formActions}>
            {result && result.net > 0 && (
              <button
                type="button"
                className="button secondary"
                onClick={() =>
                  setReveal({ rows: revealRows(result.payouts), total: result.net, paid: false })
                }
              >
                <Sparkles size={16} aria-hidden="true" /> Reveal the split
              </button>
            )}
            {canPay && selected && !dirty && paid?.has(selected.id) && (
              <span className={styles.subline}>Paid into wallets</span>
            )}
            {canPay && selected && !dirty && paid && !paid.has(selected.id) && result && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      `Pay ${silver(result.net)} into ${result.payouts.length} wallets${result.guildTax ? ` and ${silver(result.guildTax)} of guild tax into the team pot` : ""}? A split is paid in once.`,
                    )
                  )
                    void payIntoWallets();
                }}
              >
                Pay into wallets
              </button>
            )}
            {editable && (
              <button type="button" className="button primary" disabled={busy} onClick={save}>
                {busy ? "Saving…" : "Save loot split"}
              </button>
            )}
          </div>
        </section>
      </div>
      <EditorDialog
        open={!!reveal}
        wide
        title={reveal?.paid ? "Paid into wallets" : "The split"}
        onClose={() => setReveal(null)}
      >
        {reveal && (
          <>
            <LootChestReveal rows={reveal.rows} total={reveal.total} />
            <p className={styles.subline}>
              {reveal.paid ? "Each share is now in its member's Team wallet. " : ""}
              {bookkeepingLine}
            </p>
          </>
        )}
      </EditorDialog>
    </section>
  );
}
