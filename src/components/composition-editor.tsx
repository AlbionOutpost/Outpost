"use client";
import { accountCompositionDrafts } from "@/lib/account-composition-drafts";
import { accountLogoutEvent } from "@/lib/account-build-drafts";
import { contentTypes } from "@/lib/builds/validation";
import { PartyReadiness } from "./party-readiness";
import { useEffect, useLayoutEffect, useState, useRef, useSyncExternalStore } from "react";
import Link from "@/components/build-region-link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  GripVertical,
  Plus,
  Search,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import {
  compositionInput,
  roles,
  type CompositionInput,
  type MemberSlot,
} from "@/lib/compositions/validation";
import { memberRole, roleTone, slotRosterMember } from "@/lib/compositions/roster";
import { PartyBoard } from "./party-board";
import { CompositionPngExport } from "./composition-png-export";
import { EquipmentSets } from "./equipment-sets";
import { EquipmentPicker } from "./equipment-picker";
import { EditorDialog } from "./editor-dialog";
import { RosterRowCells } from "./comp-roster";
import { CompMenu } from "./comp-menu";
import { PanelHead } from "./panel-head";
import { StatusLine } from "./status-line";
import { Disclosure } from "./disclosure";
import { WellSelect } from "./well-select";
import styles from "./comps.module.css";
function member(): MemberSlot {
  return {
    id: crypto.randomUUID(),
    playerName: "",
    role: "Melee DPS",
    customRole: "",
    mandatory: true,
    substitute: "",
    notes: "",
    sourceBuildId: null,
    equipment: [],
    equipmentSets: [],
  };
}
function memberLoadoutSnapshot(slot: MemberSlot) {
  return JSON.stringify([slot.equipment, slot.equipmentSets, slot.sourceBuildId]);
}
export function CompositionEditor({
  initial,
  initialNotice,
  ownerId,
  recoveryKey,
  id,
  version,
  groups = [],
  builds = [],
}: {
  initial?: CompositionInput;
  initialNotice?: string;
  ownerId?: string;
  recoveryKey?: string;
  id?: string;
  version?: number;
  groups?: { id: string; name: string }[];
  builds?: { id: string; title: string }[];
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [draft, setDraft] = useState<CompositionInput>(
    initial || {
      title: "",
      description: "",
      region: "europe",
      contentType: "ZvZ",
      visibility: "PRIVATE",
      groupId: null,
      notes: "",
      slots: [],
    },
  );
  const [savedDraft] = useState(() => JSON.stringify(initial || null));
  const dirty = !id || JSON.stringify(draft) !== savedDraft;
  const [baseVersion, setBaseVersion] = useState(version);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const recoveryLease = useRef<number | undefined>(undefined);
  const navigationDraft = useRef<{
    owner: string;
    key: string;
    lease: number;
    draft: CompositionInput;
    baseVersion?: number;
    dirty: boolean;
  } | null>(null);
  useEffect(() => {
    if (!ownerId || !recoveryKey) return;
    recoveryLease.current = accountCompositionDrafts.activate(ownerId);
    const recovered = accountCompositionDrafts.read(ownerId, recoveryKey);
    const frame = requestAnimationFrame(() => {
      if (recovered) {
        setDraft(recovered.draft);
        setBaseVersion(recovered.baseVersion);
        setRecoveryMessage(
          recovered.baseVersion !== version
            ? "Your unsaved comp was restored. A newer revision exists; saving will report a conflict. Export JSON before reviewing the newer revision."
            : "Your unsaved comp was restored after navigation. Save or export JSON to keep it permanently.",
        );
      }
      setRecoveryReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [ownerId, recoveryKey, version]);
  useLayoutEffect(() => {
    if (!recoveryReady || !ownerId || !recoveryKey || recoveryLease.current === undefined) return;
    navigationDraft.current = {
      owner: ownerId,
      key: recoveryKey,
      lease: recoveryLease.current,
      draft,
      baseVersion,
      dirty,
    };
    if (!dirty) accountCompositionDrafts.forget(ownerId, recoveryKey);
    else if (
      !accountCompositionDrafts.remember(
        ownerId,
        recoveryKey,
        recoveryLease.current,
        draft,
        baseVersion,
      )
    ) {
      const frame = requestAnimationFrame(() =>
        setRecoveryMessage(
          "Navigation recovery is unavailable for this comp. Save or export JSON before leaving.",
        ),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [recoveryReady, ownerId, recoveryKey, draft, baseVersion, dirty]);
  useLayoutEffect(
    () => () => {
      const latest = navigationDraft.current;
      if (latest?.dirty)
        accountCompositionDrafts.remember(
          latest.owner,
          latest.key,
          latest.lease,
          latest.draft,
          latest.baseVersion,
        );
    },
    [],
  );
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const logout = (event: Event) => {
      if (
        !window.confirm(
          "Sign out and discard this unsaved comp? Save or export JSON first to keep it.",
        )
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener(accountLogoutEvent, logout);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener(accountLogoutEvent, logout);
    };
  }, [dirty]);
  const [active, setActive] = useState(0);
  const latestDraft = useRef(draft);
  useLayoutEffect(() => {
    latestDraft.current = draft;
  }, [draft]);
  const [rosterUndo, setRosterUndo] = useState<{ slots: MemberSlot[]; active: number } | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const [grouping, setGrouping] = useState("party");
  const [layout, setLayout] = useState("auto");
  const [density, setDensity] = useState("compact");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [buildQuery, setBuildQuery] = useState("");
  const [copyingBuild, setCopyingBuild] = useState(false);
  const drag = useRef<number | null>(null);
  const pointerDrag = useRef<{
    from: number;
    x: number;
    y: number;
    target: number;
    moved: boolean;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const file = useRef<HTMLInputElement>(null);
  function update<K extends keyof CompositionInput>(key: K, value: CompositionInput[K]) {
    if (key === "slots") setRosterUndo({ slots: structuredClone(draft.slots), active });
    else setRosterUndo(null);
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus("");
  }
  function patch(value: Partial<MemberSlot>) {
    const target = draft.slots[active]?.id;
    if (!target) return;
    setRosterUndo(null);
    setDraft((current) => ({
      ...current,
      slots: current.slots.map((slot) => (slot.id === target ? { ...slot, ...value } : slot)),
    }));
    setStatus("");
  }
  async function copyBuild(buildId: string) {
    const initialTarget = draft.slots[active];
    if (!buildId || !initialTarget || copyingBuild) return;
    const targetId = initialTarget.id;
    const initialLoadout = memberLoadoutSnapshot(initialTarget);
    setError("");
    setRosterUndo(null);
    setCopyingBuild(true);
    try {
      const response = await fetch(`/api/compositions/loadout?id=${encodeURIComponent(buildId)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      const target = latestDraft.current.slots.find((slot) => slot.id === targetId);
      if (!target) return;
      if (memberLoadoutSnapshot(target) !== initialLoadout) {
        setStatus(
          "This member's loadout changed while the build loaded. Your equipment and spare sets were kept; assign again to replace them.",
        );
        return;
      }
      const combinedNotes = [target.notes, body.notes].filter(Boolean).join("\n");
      setDraft((current) => ({
        ...current,
        slots: current.slots.map((slot) =>
          slot.id === targetId
            ? {
                ...slot,
                equipment: body.equipment,
                equipmentSets: body.equipmentSets || [],
                sourceBuildId: body.sourceBuildId,
                notes: combinedNotes.slice(0, 2000),
              }
            : slot,
        ),
      }));
      setStatus(
        [
          "Loadout copied into this member. Review the equipment and notes before saving.",
          body.notice || "",
          combinedNotes.length > 2000
            ? "Combined member notes were shortened to 2,000 characters. The original build remains unchanged."
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not copy build");
    } finally {
      setCopyingBuild(false);
    }
  }
  function resize(n: number) {
    if (n < 1 || n > 100) return;
    if (
      n < draft.slots.length &&
      !window.confirm(
        "Remove members beyond the selected size? Their equipment and notes will be removed from this draft.",
      )
    )
      return;
    update(
      "slots",
      Array.from({ length: n }, (_, i) => draft.slots[i] || member()),
    );
    setActive(0);
    setEditing(n === 1);
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= draft.slots.length) return;
    const next = [...draft.slots];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    update("slots", next);
    setActive(to);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = compositionInput.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Check comp fields");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(id ? `/api/compositions/${id}` : "/api/compositions", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { version: baseVersion, composition: parsed.data } : parsed.data),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (ownerId && recoveryKey) accountCompositionDrafts.forget(ownerId, recoveryKey);
      if (navigationDraft.current) navigationDraft.current.dirty = false;
      router.push(`/compositions/${body.id}?region=${parsed.data.region}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save comp");
    } finally {
      setBusy(false);
    }
  }
  const selected = draft.slots[active];
  const boardView =
    layout === "board" || (layout === "auto" && draft.slots.length >= 2 && draft.slots.length <= 7);
  const sizes = [1, 2, 5, 7, 10, 20];
  const visibilityName = { PRIVATE: "Private", PUBLIC: "Public", GROUP: "Team only" }[
    draft.visibility
  ];
  const regionName = { europe: "Europe", americas: "Americas", asia: "Asia" }[draft.region];
  function applyTemplate() {
    update(
      "slots",
      (["Tank", "Healer", "Melee DPS", "Ranged DPS", "Ranged DPS"] as const).map((role) => ({
        ...member(),
        role,
      })),
    );
    setActive(0);
  }
  function exportDraft() {
    const parsed = compositionInput.safeParse(draft);
    if (!parsed.success) {
      setError("Complete the comp before exporting.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { format: "albion-outpost-composition", version: 1, composition: parsed.data },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "albion-outpost-composition.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const sizePills = (
    <div className={styles.sizePills} role="group" aria-label="Party size">
      {sizes.map((n) => (
        <button
          type="button"
          className={styles.sizePill}
          aria-pressed={n === draft.slots.length}
          key={n}
          onClick={() => resize(n)}
        >
          {n === 1 ? "Solo" : `${n} players`}
        </button>
      ))}
      <label className={styles.sizeCustom}>
        <span>Other</span>
        <input
          aria-label="Custom comp size"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          placeholder="1–100"
          value={
            draft.slots.length && !sizes.includes(draft.slots.length) ? draft.slots.length : ""
          }
          onChange={(event) => resize(Number(event.target.value))}
        />
      </label>
    </div>
  );
  return (
    <form
      method="post"
      onSubmit={save}
      className={styles.editor}
      data-comp-editor=""
      aria-busy={!hydrated || (!!ownerId && !recoveryReady)}
    >
      <fieldset
        className={`composition-ready-guard ${styles.guard}`}
        disabled={!hydrated || (!!ownerId && !recoveryReady)}
      >
        {(initialNotice || recoveryMessage) && (
          <div className={styles.notices}>
            {initialNotice && <StatusLine>{initialNotice}</StatusLine>}
            {recoveryMessage && <StatusLine tone="stale">{recoveryMessage}</StatusLine>}
          </div>
        )}
        <div className={`raised ${styles.saveBar}`}>
          <div className={styles.saveState}>
            {error ? (
              <p role="alert" className={styles.saveError}>
                {error}
              </p>
            ) : (
              <p role="status">
                <strong>
                  {busy
                    ? "Saving…"
                    : status
                      ? status
                      : dirty
                        ? "Unsaved changes"
                        : `Saved revision ${baseVersion || 1}`}
                </strong>
                <small>
                  {draft.slots.length} {draft.slots.length === 1 ? "slot" : "slots"} · {regionName}{" "}
                  · {visibilityName}
                </small>
              </p>
            )}
          </div>
          <div className={styles.saveActions}>
            <CompMenu label="More">
              {(close) => (
                <>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      exportDraft();
                      close();
                    }}
                  >
                    <Download size={16} aria-hidden="true" /> Export JSON
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      close();
                      file.current?.click();
                    }}
                  >
                    <Upload size={16} aria-hidden="true" /> Import JSON
                  </button>
                  {draft.slots.length > 0 && <CompositionPngExport composition={draft} />}
                </>
              )}
            </CompMenu>
            <button className="button primary" disabled={busy}>
              {busy ? "Saving…" : id ? "Save comp revision" : "Save comp"}
            </button>
          </div>
        </div>
        <section className={`panel ${styles.panel}`} aria-labelledby="comp-details">
          <PanelHead
            id="comp-details"
            title="The comp"
            line="Name it, say what it is for and how many players it takes."
          />
          <div className={styles.fields}>
            <label className={styles.field}>
              Comp title
              <input
                required
                minLength={3}
                maxLength={100}
                placeholder="Roads roam · 7 players"
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </label>
            <label className={styles.field}>
              Activity
              <input
                list="composition-activity-options"
                aria-label="Content type"
                required
                maxLength={80}
                value={draft.contentType}
                onChange={(event) => update("contentType", event.target.value)}
              />
            </label>
            <datalist id="composition-activity-options">
              {contentTypes.map((activity) => (
                <option key={activity} value={activity} />
              ))}
            </datalist>
          </div>
          {draft.slots.length > 0 && (
            <div className={styles.sizeRow}>
              <span className={styles.fieldLabel}>Party size</span>
              {sizePills}
            </div>
          )}
          <Disclosure
            summary="Sharing, region & description"
            meta={`${visibilityName} · ${regionName}`}
          >
            <div className={styles.fields}>
              <label className={styles.field}>
                Comp region
                <WellSelect
                  aria-label="Comp region"
                  value={draft.region}
                  onChange={(e) => update("region", e.target.value as CompositionInput["region"])}
                >
                  <option value="europe">Europe</option>
                  <option value="americas">Americas</option>
                  <option value="asia">Asia</option>
                </WellSelect>
              </label>
              <label className={styles.field}>
                Comp visibility
                <WellSelect
                  aria-label="Comp visibility"
                  value={draft.visibility}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      visibility: e.target.value as CompositionInput["visibility"],
                      groupId: e.target.value === "GROUP" ? groups[0]?.id || null : null,
                    })
                  }
                >
                  <option value="PRIVATE">Private (only you)</option>
                  <option value="PUBLIC">Public (anyone)</option>
                  <option value="GROUP" disabled={!groups.length}>
                    Team members only
                  </option>
                </WellSelect>
              </label>
              {draft.visibility === "GROUP" && (
                <label className={styles.field}>
                  Shared team
                  <WellSelect
                    required
                    aria-label="Shared team"
                    value={draft.groupId || ""}
                    onChange={(e) => update("groupId", e.target.value)}
                  >
                    <option value="">Choose team</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </WellSelect>
                </label>
              )}
            </div>
            <label className={styles.field}>
              Description
              <textarea
                rows={3}
                value={draft.description}
                maxLength={4000}
                onChange={(e) => update("description", e.target.value)}
              />
            </label>
          </Disclosure>
          <Disclosure summary="Shotcaller notes" meta={draft.notes.trim() ? "Written" : "Optional"}>
            <label className={styles.field}>
              Shotcaller / comp notes
              <textarea
                rows={4}
                maxLength={12000}
                value={draft.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </label>
          </Disclosure>
        </section>
        <div className={styles.planner}>
          <section className={styles.party} aria-labelledby="comp-plan">
            <PanelHead
              id="comp-plan"
              title="Your party"
              line={
                draft.slots.length
                  ? `${draft.slots.length} ${draft.slots.length === 1 ? "slot" : "slots"}. Select a member to set their role and loadout.`
                  : "Pick a party size to lay out the slots."
              }
              actions={
                draft.slots.length > 0 && (
                  <>
                    {rosterUndo && (
                      <button
                        type="button"
                        className="pill-link is-small"
                        onClick={() => {
                          setDraft((current) => ({ ...current, slots: rosterUndo.slots }));
                          setActive(
                            Math.min(rosterUndo.active, Math.max(0, rosterUndo.slots.length - 1)),
                          );
                          setRosterUndo(null);
                          setStatus("Previous roster restored. Save to keep this plan.");
                        }}
                      >
                        <Undo2 size={14} aria-hidden="true" /> Undo roster change
                      </button>
                    )}
                    <span className={styles.segment} role="group" aria-label="Comp layout">
                      <button
                        type="button"
                        aria-pressed={boardView}
                        onClick={() => setLayout("board")}
                      >
                        Board
                      </button>
                      <button
                        type="button"
                        aria-pressed={!boardView}
                        onClick={() => setLayout("roster")}
                      >
                        Rows
                      </button>
                    </span>
                  </>
                )
              }
            />
            {!draft.slots.length ? (
              <div className={styles.start}>
                {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                <img src="/albion/icons/team-roles.webp" alt="" width={48} height={48} />
                <div className={styles.startCopy}>
                  <p className={styles.startTitle}>Start with your party</p>
                  <p className={styles.startLine}>
                    Choose how many players the comp takes, or start from one tank, one healer and
                    three damage dealers and change any slot.
                  </p>
                  {sizePills}
                  <div className={styles.startActions}>
                    <button type="button" className="button primary" onClick={applyTemplate}>
                      Use 5-player template
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        update("slots", [member()]);
                        setActive(0);
                        setEditing(true);
                      }}
                    >
                      <Plus size={16} aria-hidden="true" /> Add member
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <PartyReadiness members={draft.slots} region={draft.region} />
                {boardView ? (
                  <PartyBoard
                    members={draft.slots}
                    active={active}
                    onSelect={(index) => {
                      setActive(index);
                      setEditing(true);
                    }}
                  />
                ) : (
                  <div role="list" aria-label="Comp roster" className={styles.rows}>
                    {draft.slots
                      .map((s, i) => ({ s, i }))
                      .sort((a, b) =>
                        grouping === "role"
                          ? roles.indexOf(a.s.role) - roles.indexOf(b.s.role) || a.i - b.i
                          : a.i - b.i,
                      )
                      .map(({ s, i }) => (
                        <div
                          role="listitem"
                          data-member-index={i}
                          data-role={roleTone(s.role)}
                          className={styles.row}
                          data-selected={i === active ? "" : undefined}
                          data-drop={i === dropTarget ? "" : undefined}
                          key={s.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDropTarget(i);
                          }}
                          onDragLeave={() => setDropTarget(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            const draggedId = e.dataTransfer.getData("text/plain");
                            const from = draggedId
                              ? draft.slots.findIndex((slot) => slot.id === draggedId)
                              : drag.current;
                            if (from !== null && from >= 0) move(from, i);
                            drag.current = null;
                            setDropTarget(null);
                          }}
                        >
                          <span
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                e.preventDefault();
                                move(i, i + (e.key === "ArrowUp" ? -1 : 1));
                              }
                              if (e.key === "Enter") {
                                setActive(i);
                                setEditing(true);
                              }
                            }}
                            onPointerDown={(e) => {
                              if (e.button !== 0) return;
                              e.preventDefault();
                              e.currentTarget.focus();
                              e.currentTarget.setPointerCapture(e.pointerId);
                              pointerDrag.current = {
                                from: i,
                                x: e.clientX,
                                y: e.clientY,
                                target: i,
                                moved: false,
                              };
                            }}
                            onPointerMove={(e) => {
                              const d = pointerDrag.current;
                              if (!d) return;
                              if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) d.moved = true;
                              if (!d.moved) return;
                              const row = document
                                .elementFromPoint(e.clientX, e.clientY)
                                ?.closest<HTMLElement>("[data-member-index]");
                              if (row) {
                                d.target = Number(row.dataset.memberIndex);
                                setDropTarget(d.target);
                              }
                            }}
                            onPointerUp={() => {
                              const d = pointerDrag.current;
                              pointerDrag.current = null;
                              setDropTarget(null);
                              if (d?.moved && d.from !== d.target) move(d.from, d.target);
                            }}
                            onPointerCancel={() => {
                              pointerDrag.current = null;
                              setDropTarget(null);
                            }}
                            aria-label={`Drag member ${i + 1}`}
                            className={styles.dragHandle}
                          >
                            <GripVertical size={18} aria-hidden="true" />
                          </span>
                          <button
                            type="button"
                            className={styles.rowSelect}
                            aria-pressed={i === active}
                            onClick={() => {
                              setActive(i);
                              setEditing(true);
                            }}
                          >
                            <span className="sr-only">Configure member {i + 1}: </span>
                            <RosterRowCells member={slotRosterMember(s)} n={i + 1} />
                            {density === "detailed" && (
                              <span className={styles.rowExtra}>
                                {s.notes || "No notes"}
                                {s.substitute && ` · Sub: ${s.substitute}`}
                              </span>
                            )}
                          </button>
                          <span className={styles.rowMove}>
                            <button
                              type="button"
                              aria-label={`Move member ${i + 1} up`}
                              disabled={i === 0}
                              onClick={() => move(i, i - 1)}
                            >
                              <ArrowUp size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move member ${i + 1} down`}
                              disabled={i === draft.slots.length - 1}
                              onClick={() => move(i, i + 1)}
                            >
                              <ArrowDown size={15} aria-hidden="true" />
                            </button>
                          </span>
                        </div>
                      ))}
                  </div>
                )}
                <div className={styles.planFoot}>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={draft.slots.length >= 100}
                    onClick={() => {
                      update("slots", [...draft.slots, member()]);
                      setActive(draft.slots.length);
                      setEditing(true);
                    }}
                  >
                    <Plus size={16} aria-hidden="true" />
                    Add member
                  </button>
                  {!boardView && (
                    <>
                      <label className={styles.inlineField}>
                        Order
                        <WellSelect
                          aria-label="Group roster"
                          value={grouping}
                          onChange={(e) => setGrouping(e.target.value)}
                        >
                          <option value="party">Party order</option>
                          <option value="role">By role</option>
                        </WellSelect>
                      </label>
                      <label className={styles.inlineField}>
                        Detail
                        <WellSelect
                          aria-label="Roster detail"
                          value={density}
                          onChange={(e) => setDensity(e.target.value)}
                        >
                          <option value="compact">Compact</option>
                          <option value="detailed">With notes</option>
                        </WellSelect>
                      </label>
                    </>
                  )}
                </div>
              </>
            )}
          </section>
          <aside className={`panel ${styles.panel} ${styles.builds}`} aria-labelledby="comp-builds">
            <PanelHead
              id="comp-builds"
              title="Your builds"
              line="Copy a saved build into the selected slot. The copy stays independent."
            />
            {!draft.slots.length ? (
              <p className={styles.memberNote}>
                Lay out the party first, then copy a saved build into any slot.
              </p>
            ) : builds.length > 0 ? (
              <>
                <label className={styles.field}>
                  Search saved builds
                  <span className={styles.searchWell}>
                    <Search size={16} aria-hidden="true" />
                    <input
                      type="search"
                      value={buildQuery}
                      onChange={(e) => setBuildQuery(e.target.value)}
                      placeholder="Find a loadout…"
                    />
                  </span>
                </label>
                {draft.slots.length > 0 && (
                  <label className={styles.field}>
                    Assign to party slot
                    <WellSelect
                      aria-label="Build assignment slot"
                      value={active}
                      onChange={(e) => setActive(Number(e.target.value))}
                    >
                      {draft.slots.map((slot, i) => (
                        <option key={slot.id} value={i}>
                          {i + 1} · {memberRole(slot)} · {slot.playerName || "Unassigned"}
                        </option>
                      ))}
                    </WellSelect>
                  </label>
                )}
                <ul className={styles.buildList}>
                  {builds
                    .filter((build) => build.title.toLowerCase().includes(buildQuery.toLowerCase()))
                    .map((build) => (
                      <li key={build.id}>
                        <Link href={`/builds/${build.id}`} title={build.title}>
                          {build.title}
                        </Link>
                        <button
                          type="button"
                          className="button secondary"
                          disabled={!draft.slots.length || copyingBuild}
                          onClick={() => void copyBuild(build.id)}
                          aria-label={`Assign ${build.title} to selected slot`}
                        >
                          {copyingBuild ? "Copying…" : "Assign"}
                        </button>
                      </li>
                    ))}
                </ul>
                {!builds.some((build) =>
                  build.title.toLowerCase().includes(buildQuery.toLowerCase()),
                ) && <StatusLine>No saved build matches that name.</StatusLine>}
              </>
            ) : (
              <p className={styles.memberNote}>
                You have no saved builds yet. Give each member a loadout here, or save a build first
                and assign it.
              </p>
            )}
            <Link className="pill-link is-small" href="/builds/new">
              <Plus size={14} aria-hidden="true" /> Create a build
            </Link>
          </aside>
        </div>
        <EditorDialog
          open={editing}
          title={`Edit member ${active + 1}`}
          onClose={() => setEditing(false)}
          wide
        >
          <section className={`member-editor ${styles.memberEditor}`}>
            {selected ? (
              <>
                <div className={styles.memberEditorActions}>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={draft.slots.length >= 100}
                    onClick={() => {
                      update("slots", [
                        ...draft.slots,
                        { ...structuredClone(selected), id: crypto.randomUUID() },
                      ]);
                      setActive(draft.slots.length);
                    }}
                  >
                    <Copy size={16} aria-hidden="true" /> Duplicate member
                  </button>
                  <button
                    type="button"
                    className={`button secondary ${styles.danger}`}
                    onClick={() => {
                      update(
                        "slots",
                        draft.slots.filter((_, i) => i !== active),
                      );
                      setActive(Math.max(0, active - 1));
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" /> Remove member
                  </button>
                </div>
                <div className={styles.fields}>
                  <label className={styles.field}>
                    Player name
                    <input
                      maxLength={60}
                      value={selected.playerName}
                      onChange={(e) => patch({ playerName: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    Role
                    <WellSelect
                      aria-label="Member role"
                      value={selected.role}
                      onChange={(e) => patch({ role: e.target.value as MemberSlot["role"] })}
                    >
                      {roles.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </WellSelect>
                  </label>
                  {selected.role === "Custom" && (
                    <label className={styles.field}>
                      Custom role
                      <input
                        maxLength={60}
                        value={selected.customRole}
                        onChange={(e) => patch({ customRole: e.target.value })}
                      />
                    </label>
                  )}
                  <label className={styles.field}>
                    Substitute
                    <input
                      maxLength={60}
                      value={selected.substitute}
                      onChange={(e) => patch({ substitute: e.target.value })}
                    />
                  </label>
                  <label className={styles.field}>
                    Slot requirement
                    <WellSelect
                      aria-label="Slot requirement"
                      value={selected.mandatory ? "required" : "optional"}
                      onChange={(e) => patch({ mandatory: e.target.value === "required" })}
                    >
                      <option value="required">Required</option>
                      <option value="optional">Optional</option>
                    </WellSelect>
                  </label>
                  <label className={styles.field}>
                    Copy loadout from build
                    <WellSelect
                      aria-label="Copy loadout from build"
                      value=""
                      disabled={copyingBuild}
                      onChange={(e) => void copyBuild(e.target.value)}
                    >
                      <option value="">
                        {builds.length ? "Choose one of your builds" : "No saved builds yet"}
                      </option>
                      {builds.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                    </WellSelect>
                  </label>
                </div>
                <p className={styles.memberNote}>
                  Choose equipment, consumables and spare sets. Check ability unlocks in game.
                </p>
                <EquipmentSets
                  key={`sets:${selected.id}`}
                  equipment={selected.equipment}
                  sets={selected.equipmentSets}
                  onEquipment={(equipment) => patch({ equipment })}
                  onSets={(equipmentSets) => patch({ equipmentSets })}
                />
                <EquipmentPicker
                  key={`equipment:${selected.id}`}
                  value={selected.equipment}
                  onChange={(equipment) => patch({ equipment })}
                />
                <label className={styles.field}>
                  Member notes
                  <textarea
                    rows={3}
                    value={selected.notes}
                    maxLength={2000}
                    onChange={(e) => patch({ notes: e.target.value })}
                  />
                </label>
              </>
            ) : (
              <p className={styles.memberNote}>Choose a party size or add a member to begin.</p>
            )}
          </section>
          <button
            type="button"
            className="button primary member-done"
            onClick={() => setEditing(false)}
          >
            Done editing member
          </button>
        </EditorDialog>
        <input
          ref={file}
          className="sr-only"
          aria-label="Import comp file"
          disabled={!hydrated}
          type="file"
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              if (f.size > 1048576) throw new Error("Import must be at most 1 MiB");
              const json = JSON.parse(await f.text());
              if (
                !["albion-outpost-composition", "albion-atlas-composition"].includes(json.format) ||
                json.version !== 1
              )
                throw new Error("Unsupported comp format");
              const parsed = compositionInput.parse(json.composition);
              setRosterUndo(null);
              setDraft({
                ...parsed,
                visibility: "PRIVATE",
                groupId: null,
                slots: parsed.slots.map((s) => ({
                  ...s,
                  id: crypto.randomUUID(),
                  sourceBuildId: null,
                })),
              });
              setActive(0);
              setError("");
              setStatus("Imported as a private draft. Save to keep it.");
            } catch {
              setError("That file isn’t a comp export Outpost can read. Your draft was kept.");
            }
            e.target.value = "";
          }}
        />
      </fieldset>
    </form>
  );
}
