"use client";
import { useEffect, useState } from "react";
import { allocateLoot, lootConfiguration, type LootConfiguration } from "@/lib/groups/loot";
import { accountLogoutEvent } from "@/lib/account-build-drafts";
import { Download, Plus, RotateCcw, X } from "lucide-react";
import { PanelHead } from "./panel-head";
import { EmptyWell } from "./empty-well";
import { StatusLine } from "./status-line";
import { WellSelect } from "./well-select";
import { Disclosure } from "./disclosure";
import { Field } from "./group-parts";
import styles from "./teams.module.css";

/** Fired by the workspace masthead's New split button. */
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
  active,
}: {
  groupId: string;
  userId: string;
  members: { userId: string; name: string }[];
  editable: boolean;
  active: boolean;
}) {
  const initial: LootConfiguration = {
    pool: 0,
    notes: "",
    expenses: [],
    participants: [{ userId, shares: 1 }],
  };
  const [configuration, setConfiguration] = useState(initial),
    [title, setTitle] = useState("New loot split"),
    [selected, setSelected] = useState<Saved | null>(null);
  const [saved, setSaved] = useState<Saved[]>([]),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [baseline, setBaseline] = useState(
    JSON.stringify({ title: "New loot split", configuration: initial }),
  );
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
    const nextTitle = row?.title || "New loot split";
    setConfiguration(value.data);
    setTitle(nextTitle);
    setSelected(row);
    setBaseline(JSON.stringify({ title: nextTitle, configuration: value.data }));
    setError("");
    setMessage("");
  }
  async function save() {
    if (!parsed.success || title.trim().length < 3 || title.trim().length > 100) {
      setError(
        "Use a 3–100 character name, whole-silver amounts, and current team participants. Expenses cannot exceed the pool.",
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
            <Field label="Split name">
              <input
                aria-label="Split name"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="Total loot pool (silver)">
              <input
                aria-label="Total loot pool (silver)"
                type="number"
                min={0}
                max={Number.MAX_SAFE_INTEGER}
                step={1}
                value={configuration.pool}
                onChange={(e) =>
                  setConfiguration({ ...configuration, pool: Number(e.target.value) })
                }
              />
            </Field>
          </div>
          <h3 className={styles.subhead}>Expenses</h3>
          <p className={styles.subline}>
            Repairs, food and other costs, paid back before the share.
          </p>
          {configuration.expenses.map((expense, i) => (
            <div className={`well ${styles.lootRow}`} key={i}>
              <Field label={`Expense ${i + 1}`}>
                <input
                  aria-label={`Expense ${i + 1} description`}
                  maxLength={100}
                  value={expense.label}
                  onChange={(e) =>
                    setConfiguration({
                      ...configuration,
                      expenses: configuration.expenses.map((row, j) =>
                        j === i ? { ...row, label: e.target.value } : row,
                      ),
                    })
                  }
                />
              </Field>
              <Field label="Silver">
                <input
                  aria-label={`Expense ${i + 1} silver`}
                  type="number"
                  min={0}
                  step={1}
                  value={expense.silver}
                  onChange={(e) =>
                    setConfiguration({
                      ...configuration,
                      expenses: configuration.expenses.map((row, j) =>
                        j === i ? { ...row, silver: Number(e.target.value) } : row,
                      ),
                    })
                  }
                />
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
          ))}
          <div className={styles.rowActions}>
            <button
              type="button"
              className="button secondary"
              disabled={configuration.expenses.length >= 50}
              onClick={() =>
                setConfiguration({
                  ...configuration,
                  expenses: [...configuration.expenses, { label: "Expense", silver: 0 }],
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
              <Field label="Shares">
                <input
                  aria-label={`Shares for ${members.find((m) => m.userId === participant.userId)?.name || participant.userId}`}
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  value={participant.shares}
                  onChange={(e) =>
                    setConfiguration({
                      ...configuration,
                      participants: configuration.participants.map((row, j) =>
                        j === i ? { ...row, shares: Number(e.target.value) } : row,
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
              <dl className={styles.facts}>
                <div>
                  <dt>Loot pool</dt>
                  <dd>{silver(result.pool)}</dd>
                </div>
                <div>
                  <dt>Expenses</dt>
                  <dd>{silver(result.expenses)}</dd>
                </div>
                <div className={styles.factLead}>
                  <dt>Shared payout</dt>
                  <dd>{silver(result.net)}</dd>
                </div>
              </dl>
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
              Add at least one participant and whole-silver amounts; expenses must fit in the pool.
            </StatusLine>
          )}
          {editable && (
            <div className={styles.formActions}>
              <button type="button" className="button primary" disabled={busy} onClick={save}>
                {busy ? "Saving…" : "Save loot split"}
              </button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
