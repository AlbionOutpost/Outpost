"use client";
import { useEffect, useState } from "react";
import { allocateLoot, lootConfiguration, type LootConfiguration } from "@/lib/groups/loot";
import { accountLogoutEvent } from "@/lib/account-build-drafts";

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
  return (
    <section className="team-loot-workspace" aria-label="Team loot splits">
      <div className="section-heading">
        <div>
          <h2>Loot splits</h2>
          <p>Record the pool, reimburse expenses, then share the remaining silver fairly.</p>
        </div>
        <div className="button-row">
          <button type="button" className="button secondary" onClick={exportDraft}>
            Export split JSON
          </button>
          {editable && (
            <button type="button" className="button primary" disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Save loot split"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <div className="team-loot-columns">
        <aside className="panel">
          <h3>Saved splits</h3>
          <p>Latest 50 · visible to current team members.</p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setLoaded(false);
              setLoadAttempt((attempt) => attempt + 1);
            }}
          >
            Refresh saved splits
          </button>
          {editable && (
            <button type="button" className="button secondary" onClick={() => open(null)}>
              New split
            </button>
          )}
          {saved.map((row) => (
            <button
              type="button"
              key={row.id}
              className="team-saved-split"
              aria-pressed={selected?.id === row.id}
              onClick={() => open(row)}
            >
              {row.title}
              <small>Revision {row.version}</small>
            </button>
          ))}
          {loaded && !saved.length && <p>No saved splits yet.</p>}
        </aside>
        <div>
          <fieldset disabled={!editable || busy} className="panel team-loot-inputs">
            <legend>Split inputs</legend>
            <label>
              Split name
              <input
                aria-label="Split name"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Total loot pool (silver)
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
            </label>
            <h3>Expenses</h3>
            <p>Manual reimbursements deducted before sharing the remainder.</p>
            {configuration.expenses.map((expense, i) => (
              <div className="team-loot-expense" key={i}>
                <label>
                  Expense {i + 1}
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
                </label>
                <label>
                  Silver
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
                </label>
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    setConfiguration({
                      ...configuration,
                      expenses: configuration.expenses.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remove expense {i + 1}
                </button>
              </div>
            ))}
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
              Add expense
            </button>
            <h3>Participants & shares</h3>
            <p>Equal shares split evenly. Use more shares for an agreed weighted payout.</p>
            {configuration.participants.map((participant, i) => (
              <div className="team-loot-participant" key={participant.userId}>
                <span>
                  {members.find((m) => m.userId === participant.userId)?.name ||
                    "Former team member"}
                </span>
                <label>
                  Shares
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
                </label>
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    setConfiguration({
                      ...configuration,
                      participants: configuration.participants.filter((_, j) => j !== i),
                    })
                  }
                >
                  Remove participant {i + 1}
                </button>
              </div>
            ))}
            <label>
              Add participant
              <select
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
              </select>
            </label>
            <label>
              Split notes
              <textarea
                maxLength={2000}
                value={configuration.notes}
                onChange={(e) => setConfiguration({ ...configuration, notes: e.target.value })}
              />
            </label>
          </fieldset>
          <section className="panel team-loot-results" aria-label="Loot payout preview">
            <h3>Payout preview</h3>
            {result ? (
              <>
                <dl>
                  <div>
                    <dt>Loot pool</dt>
                    <dd>{result.pool.toLocaleString()} silver</dd>
                  </div>
                  <div>
                    <dt>Expenses</dt>
                    <dd>{result.expenses.toLocaleString()} silver</dd>
                  </div>
                  <div>
                    <dt>Shared payout</dt>
                    <dd>{result.net.toLocaleString()} silver</dd>
                  </div>
                </dl>
                <table>
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Shares</th>
                      <th>Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.payouts.map((row) => (
                      <tr key={row.userId}>
                        <td>
                          {members.find((m) => m.userId === row.userId)?.name ||
                            "Former team member"}
                        </td>
                        <td>{row.shares}</td>
                        <td>
                          {row.silver.toLocaleString()} silver
                          {row.roundingSilver > 0 && <small>Includes 1 rounding silver</small>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>
                  {result.roundingSilver} rounding silver allocated by largest fractional remainder;
                  ties use stable member ID. Unallocated: 0 silver.
                </p>
              </>
            ) : (
              <p>
                Choose at least one participant and valid whole-silver amounts. Expenses must fit
                within the pool.
              </p>
            )}
            <p>
              Manual accounting only. Save records the plan; Outpost does not transfer silver in
              Albion.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
