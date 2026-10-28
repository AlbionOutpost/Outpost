"use client";
import { useState, useRef, useSyncExternalStore } from "react";
import Link from "@/components/link";
import { useRouter } from "next/navigation";
import { GripVertical, ArrowUp, ArrowDown, Copy, Trash2, Plus, Swords } from "lucide-react";
import {
  compositionInput,
  roles,
  type CompositionInput,
  type MemberSlot,
} from "@/lib/compositions/validation";
import { PartyBoard } from "./party-board";
import { CompositionPngExport } from "./composition-png-export";
import { EquipmentSets } from "./equipment-sets";
import { EquipmentPicker } from "./equipment-picker";
import { EquipmentStrip } from "./equipment-strip";
import { EditorDialog } from "./editor-dialog";
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
export function CompositionEditor({
  initial,
  id,
  version,
  groups = [],
  builds = [],
}: {
  initial?: CompositionInput;
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
  const [active, setActive] = useState(0);
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
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus("");
  }
  function patch(value: Partial<MemberSlot>) {
    const target = draft.slots[active]?.id;
    if (!target) return;
    setDraft((current) => ({
      ...current,
      slots: current.slots.map((slot) => (slot.id === target ? { ...slot, ...value } : slot)),
    }));
    setStatus("");
  }
  async function copyBuild(buildId: string) {
    const targetId = draft.slots[active]?.id;
    if (!buildId || !targetId || copyingBuild) return;
    setError("");
    setCopyingBuild(true);
    try {
      const response = await fetch(`/api/compositions/loadout?id=${encodeURIComponent(buildId)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setDraft((current) => ({
        ...current,
        slots: current.slots.map((slot) =>
          slot.id === targetId
            ? {
                ...slot,
                equipment: body.equipment,
                equipmentSets: body.equipmentSets || [],
                sourceBuildId: body.sourceBuildId,
                notes: [slot.notes, body.notes].filter(Boolean).join("\n").slice(0, 2000),
              }
            : slot,
        ),
      }));
      setStatus(
        "Build equipment and supported ability selections copied; unvalidated author notes remain separate.",
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
        body: JSON.stringify(id ? { version, composition: parsed.data } : parsed.data),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      router.push(`/compositions/${body.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save comp");
    } finally {
      setBusy(false);
    }
  }
  const selected = draft.slots[active];
  return (
    <form onSubmit={save} className="party-editor">
      <div className="party-command-bar">
        <label>
          Comp title
          <input
            required
            minLength={3}
            maxLength={100}
            placeholder="e.g. Roads roaming · 7 players"
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </label>
        <label className="party-activity">
          Activity
          <input
            aria-label="Content type"
            required
            maxLength={80}
            value={draft.contentType}
            onChange={(event) => update("contentType", event.target.value)}
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : id ? "Save comp revision" : "Save comp"}
        </button>
      </div>
      <details className="party-settings">
        <summary>Sharing, region & description</summary>
        <div className="input-grid">
          <label>
            Custom size
            <input
              aria-label="Custom comp size"
              type="number"
              min={1}
              max={100}
              value={draft.slots.length || ""}
              onChange={(e) => resize(Number(e.target.value))}
            />
          </label>

          <label>
            Comp region
            <select
              aria-label="Comp region"
              value={draft.region}
              onChange={(e) => update("region", e.target.value as CompositionInput["region"])}
            >
              {["europe", "americas", "asia"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Comp visibility
            <select
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
                Guild members only
              </option>
            </select>
          </label>
          {draft.visibility === "GROUP" && (
            <label>
              Shared group
              <select
                required
                aria-label="Shared group"
                value={draft.groupId || ""}
                onChange={(e) => update("groupId", e.target.value)}
              >
                <option value="">Choose group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label>
          Description
          <textarea
            value={draft.description}
            maxLength={4000}
            onChange={(e) => update("description", e.target.value)}
          />
        </label>
      </details>
      {!draft.slots.length && (
        <section className="panel comp-start-template">
          <h2>Start with a party layout</h2>
          <p>
            One tank, one healer and three DPS slots. An editable planning layout, not a meta
            recommendation.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              update(
                "slots",
                (["Tank", "Healer", "Melee DPS", "Ranged DPS", "Ranged DPS"] as const).map(
                  (role) => ({ ...member(), role }),
                ),
              );
              setActive(0);
            }}
          >
            Use 5-player party template
          </button>
        </section>
      )}
      {!!draft.slots.length && (
        <p className="muted" role="status">
          {draft.slots.filter((s) => s.mandatory && !s.playerName.trim()).length} required players
          unassigned ·{" "}
          {draft.slots.filter((s) => !s.equipment.some((e) => e.slot === "Main hand")).length}{" "}
          loadouts need a weapon · {draft.slots.filter((s) => s.substitute.trim()).length}{" "}
          substitutes recorded
        </p>
      )}
      <section className="reference-party-summary" aria-label="Composition role summary">
        <div>
          <h2>Party readiness</h2>
          <p>
            {draft.slots.length
              ? `${draft.slots.filter((s) => s.playerName.trim()).length} / ${draft.slots.length} players assigned`
              : "Choose a party size or start with the five-player template."}
          </p>
        </div>
        <div className="reference-role-counts">
          {["Tank", "Healer", "Melee DPS", "Ranged DPS", "Support"].map((role) => (
            <span key={role}>
              <strong>{draft.slots.filter((s) => s.role === role).length}</strong>
              {role}
            </span>
          ))}
        </div>
        <p className="muted">
          Role counts describe your plan. Activity requirements and combat compatibility are not
          inferred.
        </p>
      </section>
      <div className="party-tools-bar">
        <section className="party-size-bar">
          <div className="actions section">
            {[1, 2, 5, 7, 10, 20].map((n) => (
              <button
                type="button"
                className="button secondary"
                aria-pressed={n === draft.slots.length}
                key={n}
                onClick={() => resize(n)}
              >
                {n === 1 ? "Solo" : `${n} players`}
              </button>
            ))}
          </div>
        </section>
        {draft.slots.length > 0 && (
          <div className="composition-layout-controls">
            <label>
              View
              <select
                aria-label="Comp layout"
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
              >
                <option value="auto">Auto layout</option>
                <option value="board">Party board</option>
                <option value="roster">Compact roster</option>
              </select>
            </label>
            <CompositionPngExport composition={draft} />
          </div>
        )}
      </div>
      <div className="reference-party-workspace">
        {(layout === "board" ||
          (layout === "auto" && draft.slots.length >= 2 && draft.slots.length <= 7)) && (
          <PartyBoard
            title={draft.title}
            members={draft.slots}
            active={active}
            onSelect={(index) => {
              setActive(index);
              setEditing(true);
            }}
          />
        )}
        <div className="party-workspace section">
          <section
            hidden={
              layout === "board" ||
              (layout === "auto" && draft.slots.length >= 2 && draft.slots.length <= 7)
            }
            className={`party-roster ${density}`}
          >
            {draft.slots.length > 0 && (
              <div className="roster-toolbar">
                <div>
                  <h2>
                    Party overview <span className="badge">{draft.slots.length} players</span>
                  </h2>
                  <p>Inspect the whole party. Select a player to edit their gear.</p>
                </div>
                <div className="actions">
                  <label>
                    Group roster
                    <select
                      aria-label="Group roster"
                      value={grouping}
                      onChange={(e) => setGrouping(e.target.value)}
                    >
                      <option value="party">Party order</option>
                      <option value="role">By role</option>
                    </select>
                  </label>
                  <label>
                    Roster detail
                    <select
                      aria-label="Roster detail"
                      value={density}
                      onChange={(e) => setDensity(e.target.value)}
                    >
                      <option value="compact">Compact</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </label>
                </div>
              </div>
            )}
            <div role="list" aria-label="Comp roster">
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
                    className={`roster-row${i === active ? " selected" : ""}${i === dropTarget ? " drop-target" : ""}`}
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
                      className="drag-handle"
                    >
                      <GripVertical size={18} />
                    </span>
                    <button
                      type="button"
                      className="member-select"
                      aria-pressed={i === active}
                      onClick={() => {
                        setActive(i);
                        setEditing(true);
                      }}
                    >
                      <span className="sr-only">Configure member {i + 1}: </span>
                      <span className="member-index">{String(i + 1).padStart(2, "0")}</span>
                      <span className="roster-player">
                        <b>{s.playerName || `Slot ${i + 1}`}</b>
                        <small>{s.role === "Custom" ? s.customRole || "Custom" : s.role}</small>
                      </span>
                      <EquipmentStrip equipment={s.equipment} />
                      <span className={`assignment-status${s.playerName ? " assigned" : ""}`}>
                        {s.playerName ? "Assigned" : "Unassigned"}
                        <small>
                          {s.equipment.some((e) => e.alternatives.length)
                            ? "Swap available"
                            : s.mandatory
                              ? "Required"
                              : "Optional"}
                        </small>
                      </span>
                      {density === "detailed" && (
                        <span className="roster-extra">
                          {s.notes || "No notes"}
                          {s.substitute && ` · Sub: ${s.substitute}`}
                        </span>
                      )}
                    </button>
                    <div className="roster-move">
                      <button
                        type="button"
                        aria-label={`Move member ${i + 1} up`}
                        disabled={i === 0}
                        onClick={() => move(i, i - 1)}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move member ${i + 1} down`}
                        disabled={i === draft.slots.length - 1}
                        onClick={() => move(i, i + 1)}
                      >
                        <ArrowDown size={15} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            {!draft.slots.length && (
              <div className="comp-roster-empty">
                <Swords size={32} aria-hidden="true" />
                <h2>Start with your party</h2>
                <p>
                  Choose a party size above, or add your first player below. Assign roles and gear
                  one slot at a time.
                </p>
              </div>
            )}
            <button
              type="button"
              className={`button ${draft.slots.length ? "secondary section" : "primary"}`}
              disabled={draft.slots.length >= 100}
              onClick={() => {
                update("slots", [...draft.slots, member()]);
                setActive(draft.slots.length);
                setEditing(true);
              }}
            >
              <Plus size={16} />
              Add member
            </button>
          </section>
          <EditorDialog
            open={editing}
            title={`Edit member ${active + 1}`}
            onClose={() => setEditing(false)}
            wide
          >
            <section className="member-editor">
              {selected ? (
                <>
                  <div className="section-heading">
                    <h2>
                      <Swords size={20} /> Member {active + 1}
                    </h2>
                    <div className="actions">
                      <button
                        type="button"
                        className="button secondary"
                        aria-label="Duplicate selected member"
                        disabled={draft.slots.length >= 100}
                        onClick={() => {
                          update("slots", [
                            ...draft.slots,
                            { ...structuredClone(selected), id: crypto.randomUUID() },
                          ]);
                          setActive(draft.slots.length);
                        }}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        aria-label="Remove selected member"
                        onClick={() => {
                          update(
                            "slots",
                            draft.slots.filter((_, i) => i !== active),
                          );
                          setActive(Math.max(0, active - 1));
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="input-grid">
                    <label>
                      Player name
                      <input
                        maxLength={60}
                        value={selected.playerName}
                        onChange={(e) => patch({ playerName: e.target.value })}
                      />
                    </label>
                    <label>
                      Role
                      <select
                        aria-label="Member role"
                        value={selected.role}
                        onChange={(e) => patch({ role: e.target.value as MemberSlot["role"] })}
                      >
                        {roles.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    {selected.role === "Custom" && (
                      <label>
                        Custom role
                        <input
                          maxLength={60}
                          value={selected.customRole}
                          onChange={(e) => patch({ customRole: e.target.value })}
                        />
                      </label>
                    )}
                    <label>
                      Substitute
                      <input
                        maxLength={60}
                        value={selected.substitute}
                        onChange={(e) => patch({ substitute: e.target.value })}
                      />
                    </label>
                    <label>
                      Slot requirement
                      <select
                        aria-label="Slot requirement"
                        value={selected.mandatory ? "required" : "optional"}
                        onChange={(e) => patch({ mandatory: e.target.value === "required" })}
                      >
                        <option value="required">Required</option>
                        <option value="optional">Optional</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Copy loadout from build
                    <select
                      aria-label="Copy loadout from build"
                      value=""
                      disabled={copyingBuild}
                      onChange={(e) => void copyBuild(e.target.value)}
                    >
                      <option value="">Choose an accessible build</option>
                      {builds.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="muted">
                    July source catalog with equipment, consumables and spare sets. Confirm spell
                    availability and unlocks in game. Build copies are independent snapshots.
                  </p>
                  <EquipmentSets
                    key={selected.id}
                    equipment={selected.equipment}
                    sets={selected.equipmentSets}
                    onEquipment={(equipment) => patch({ equipment })}
                    onSets={(equipmentSets) => patch({ equipmentSets })}
                  />
                  <EquipmentPicker
                    key={selected.id}
                    value={selected.equipment}
                    onChange={(equipment) => patch({ equipment })}
                  />
                  <label>
                    Member notes
                    <textarea
                      value={selected.notes}
                      maxLength={2000}
                      onChange={(e) => patch({ notes: e.target.value })}
                    />
                  </label>
                </>
              ) : (
                <div className="empty">Choose a group size or add a member to begin.</div>
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
        </div>
        <aside className="reference-available-builds">
          <h2>Available builds</h2>
          <label>
            Search saved builds
            <input
              type="search"
              value={buildQuery}
              onChange={(e) => setBuildQuery(e.target.value)}
              placeholder="Find a loadout…"
            />
          </label>
          {draft.slots.length > 0 && (
            <label>
              Assign to party slot
              <select
                aria-label="Build assignment slot"
                value={active}
                onChange={(e) => setActive(Number(e.target.value))}
              >
                {draft.slots.map((slot, i) => (
                  <option key={slot.id} value={i}>
                    {i + 1} · {slot.role === "Custom" ? slot.customRole || "Custom" : slot.role} ·{" "}
                    {slot.playerName || "Unassigned"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <ul>
            {builds
              .filter((build) => build.title.toLowerCase().includes(buildQuery.toLowerCase()))
              .map((build) => (
                <li key={build.id}>
                  <Link href={`/builds/${build.id}`}>{build.title}</Link>
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
          {!builds.length && (
            <p className="muted">
              No accessible saved builds yet. Create a build, or configure each party member
              directly.
            </p>
          )}
          {builds.length > 0 &&
            !builds.some((build) =>
              build.title.toLowerCase().includes(buildQuery.toLowerCase()),
            ) && <p className="muted">No matching build. Try another name.</p>}
          <Link className="text-link" href="/builds/new">
            Create a new build
          </Link>
          <p className="muted">
            Copies are independent snapshots. Existing build access and ownership rules still apply.
          </p>
        </aside>
      </div>
      <details className="party-notes">
        <summary>Shotcaller notes</summary>
        <label>
          Shotcaller / comp notes
          <textarea
            rows={4}
            maxLength={12000}
            value={draft.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </label>
      </details>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p role="status">{status}</p>
      <div className="actions section party-save-bar">
        <span className="draft-status">
          {busy ? "Saving party…" : "Draft · Save to keep changes"}
        </span>

        <button
          type="button"
          className="button secondary"
          onClick={() => {
            const parsed = compositionInput.safeParse(draft);
            if (!parsed.success) {
              setError("Complete the comp before exporting.");
              return;
            }
            const url = URL.createObjectURL(
              new Blob(
                [
                  JSON.stringify(
                    { format: "albion-atlas-composition", version: 1, composition: parsed.data },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              ),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "atlas-composition.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export JSON
        </button>
        <button type="button" className="button secondary" onClick={() => file.current?.click()}>
          Import JSON
        </button>
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
              if (json.format !== "albion-atlas-composition" || json.version !== 1)
                throw new Error("Unsupported comp format");
              const parsed = compositionInput.parse(json.composition);
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
              setError("Invalid or unsupported comp export. Your draft was kept.");
            }
            e.target.value = "";
          }}
        />
        <Link className="button secondary" href="/compositions">
          Back to comps
        </Link>
      </div>
    </form>
  );
}
