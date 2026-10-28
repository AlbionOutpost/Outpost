"use client";
import { EquipmentSets } from "./equipment-sets";
import { EquipmentPicker } from "./equipment-picker";
import { findEquipment } from "@/lib/albion/equipment-catalog";
import type { EquipmentChoice } from "@/lib/compositions/validation";
import { useEffect, useRef, useState } from "react";
import { templateEquipment } from "@/lib/albion/equipment-sets";
import { BuildLoadoutView } from "./build-loadout-view";
import { EditorDialog } from "./editor-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildInput, slots, contentTypes, type BuildInput } from "@/lib/builds/validation";
const empty: BuildInput = {
  equipmentSets: [],
  title: "",
  description: "",
  contentType: "Other",
  region: "europe",
  visibility: "PRIVATE",
  playerCount: 1,
  recommendedIP: 0,
  strategy: "",
  patchNotes: "",
  equipment: [
    {
      slot: "Main hand",
      itemId: "",
      quality: 1,
      abilities: "",
      alternatives: "",
      abilitySelections: {},
      alternativeItemIds: [],
    },
  ],
};
export function BuildEditor({
  initial,
  id,
  version,
  guest = false,
}: {
  initial?: BuildInput;
  id?: string;
  version?: number;
  guest?: boolean;
}) {
  const [draft, setDraft] = useState<BuildInput>(initial || empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const restored = useRef(false);
  useEffect(() => {
    if (!guest || initial || restored.current) return;
    const frame = requestAnimationFrame(() => {
      restored.current = true;
      try {
        const saved = localStorage.getItem("outpost-guest-build-v1");
        if (!saved) return;
        if (saved.length > 65536) throw new Error();
        const parsed = buildInput.parse(JSON.parse(saved));
        setDraft(parsed);
        setShareMessage("Guest draft restored from this device.");
      } catch {
        setError(
          "The saved guest draft could not be restored. You can start a new build or import JSON.",
        );
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [guest, initial]);
  const router = useRouter();
  const update = <K extends keyof BuildInput>(key: K, value: BuildInput[K]) =>
    setDraft({ ...draft, [key]: value });
  function equip(index: number, field: string, value: string | number) {
    update(
      "equipment",
      draft.equipment.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
              ...(field === "itemId" ? { abilitySelections: {}, alternativeItemIds: [] } : {}),
            }
          : row,
      ),
    );
  }
  const supportedEquipment = draft.equipment
    .filter((e) => !!findEquipment(e.itemId))
    .map((e) => ({
      slot: e.slot,
      itemId: e.itemId,
      quality: e.quality,
      abilities: e.abilitySelections,
      alternatives: e.alternativeItemIds,
    }));
  function updateEquipment(gear: EquipmentChoice[]) {
    update("equipment", [
      ...draft.equipment.filter(
        (e) => !findEquipment(e.itemId) && !gear.some((g) => g.slot === e.slot),
      ),
      ...gear.map((e) => ({
        slot: e.slot,
        itemId: e.itemId,
        quality: e.quality,
        abilities: draft.equipment.find((old) => old.slot === e.slot)?.abilities || "",
        alternatives: draft.equipment.find((old) => old.slot === e.slot)?.alternatives || "",
        abilitySelections: e.abilities,
        alternativeItemIds: e.alternatives,
      })),
    ]);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = buildInput.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid build");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (guest) {
        localStorage.setItem("outpost-guest-build-v1", JSON.stringify(parsed.data));
        setShareMessage(
          "Guest draft saved on this device. No account or public build was created.",
        );
        return;
      }
      const response = await fetch(id ? `/api/builds/${id}` : "/api/builds", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { version, build: parsed.data } : parsed.data),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      router.push(`/builds/${body.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save build");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={save} className="build-editor">
      {guest && !initial && (
        <div className="guest-build-notice">
          <div>
            <strong>A loadout for your next adventure.</strong>
            <p>
              Choose your gear, pick your spells, keep a swap ready. Guest drafts save on this
              device.
            </p>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              if (
                supportedEquipment.length &&
                !window.confirm(
                  "Replace your current equipment with the example set? Save your draft first to keep it.",
                )
              )
                return;
              updateEquipment(templateEquipment("battleaxe"));
              if (!draft.title) setDraft((d) => ({ ...d, title: "My Battleaxe build" }));
            }}
          >
            Load example equipment
          </button>
        </div>
      )}
      <div className="build-command-bar">
        <label>
          Build title
          <input
            required
            minLength={3}
            maxLength={100}
            value={draft.title}
            placeholder="Name your loadout"
            onChange={(e) => update("title", e.target.value)}
          />
        </label>
        <label>
          Activity
          <select
            aria-label="Content type"
            value={draft.contentType}
            onChange={(e) => update("contentType", e.target.value as BuildInput["contentType"])}
          >
            {contentTypes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        {!guest && (
          <label>
            Build visibility
            <select
              aria-label="Build visibility"
              value={draft.visibility}
              onChange={(e) => update("visibility", e.target.value as BuildInput["visibility"])}
            >
              <option value="PRIVATE">Private</option>
              <option value="UNLISTED">Unlisted</option>
              <option value="PUBLIC">Public</option>
            </select>
          </label>
        )}
        <button className="button primary" disabled={saving}>
          {saving
            ? "Saving…"
            : guest
              ? "Save on this device"
              : id
                ? "Save new revision"
                : "Save build"}
        </button>
        {!guest && (
          <button
            type="button"
            className="button secondary"
            disabled={!id}
            title={
              id
                ? "Copy a link to the saved build; access follows its visibility"
                : "Save the build to get a share link"
            }
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${location.origin}/builds/${id}`);
                setShareMessage("Saved build link copied. Access follows build visibility.");
              } catch {
                setShareMessage("Open the saved build to copy its address.");
              }
            }}
          >
            Copy saved link
          </button>
        )}
        <button
          type="button"
          className="button secondary"
          disabled={!supportedEquipment.length}
          onClick={() => setPreview(true)}
        >
          Preview build
        </button>
        <details className="build-file-tools">
          <summary>Import & export</summary>
          <div>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                const parsed = buildInput.safeParse(draft);
                if (!parsed.success) {
                  setError("Add a title and valid equipment before exporting.");
                  return;
                }
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(parsed.data, null, 2)], { type: "application/json" }),
                );
                const link = document.createElement("a");
                link.href = url;
                link.download = "outpost-build.json";
                link.click();
                URL.revokeObjectURL(url);
                setShareMessage(
                  "Build JSON exported with your equipment, abilities, swaps and spare sets.",
                );
              }}
            >
              Export build JSON
            </button>
            <label className="build-import-label">
              Import build JSON
              <input
                type="file"
                accept="application/json,.json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    if (file.size > 65536) throw new Error();
                    const parsed = buildInput.parse(JSON.parse(await file.text()));
                    setDraft(parsed);
                    setError("");
                    setShareMessage("Build imported. Review it before saving.");
                  } catch {
                    setError(
                      "Choose a valid Outpost build JSON file under64KB. Your current build was kept.",
                    );
                  }
                }}
              />
            </label>
          </div>
        </details>
      </div>
      {preview && (
        <EditorDialog open wide title="Build preview" onClose={() => setPreview(false)}>
          <div className="guest-build-preview">
            <h2>{draft.title || "Untitled build"}</h2>
            <p>
              {draft.contentType} · {guest ? "Guest draft" : "Unsaved preview"}
            </p>
            <BuildLoadoutView
              region={draft.region}
              equipment={draft.equipment.filter((row) => row.itemId)}
            />
          </div>
        </EditorDialog>
      )}
      {shareMessage && (
        <p role="status" className="muted">
          {shareMessage}
        </p>
      )}
      <div className="build-editor-context">
        <span>Equipment, spells & swaps</span>
        <span>
          {id
            ? `Revision ${version ?? 1} · save to create the next revision`
            : supportedEquipment.length
              ? `${supportedEquipment.length} items equipped · draft`
              : "New loadout · equip a slot to begin"}
        </span>
      </div>
      {draft.equipment.some((row) => row.itemId && !findEquipment(row.itemId)) && (
        <p className="studio-notice">
          This build includes exact item IDs outside the visual picker. They are kept in your draft;
          use{" "}
          <a className="text-link" href="#advanced-build-items">
            Advanced item IDs & notes
          </a>{" "}
          to edit them.
        </p>
      )}
      <EquipmentPicker
        variant="build"
        value={draft.equipment
          .filter((e) => !!findEquipment(e.itemId))
          .map((e) => ({
            slot: e.slot,
            itemId: e.itemId,
            quality: e.quality,
            abilities: e.abilitySelections,
            alternatives: e.alternativeItemIds,
          }))}
        onChange={updateEquipment}
      />
      <EquipmentSets
        equipment={supportedEquipment}
        sets={draft.equipmentSets}
        onEquipment={updateEquipment}
        onSets={(sets) => update("equipmentSets", sets)}
      />
      <details className="build-settings panel">
        <summary>Build settings & description</summary>
        <div className="input-grid">
          <label>
            Build region
            <select
              aria-label="Build region"
              value={draft.region}
              onChange={(e) => update("region", e.target.value as BuildInput["region"])}
            >
              <option value="europe">Europe</option>
              <option value="americas">Americas</option>
              <option value="asia">Asia</option>
            </select>
          </label>
          <label>
            Player count
            <input
              type="number"
              min={1}
              max={400}
              value={draft.playerCount}
              onChange={(e) => update("playerCount", Number(e.target.value))}
            />
          </label>
          <label>
            Recommended IP (author estimate)
            <input
              type="number"
              min={0}
              max={4000}
              value={draft.recommendedIP}
              onChange={(e) => update("recommendedIP", Number(e.target.value))}
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            maxLength={4000}
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </label>
      </details>
      <details className="advanced-build panel" id="advanced-build-items">
        <summary>Advanced item IDs & notes</summary>
        <p className="muted">
          Use exact IDs for items outside the supported picker. Author-entered ability notes are not
          validated spell selections.
        </p>
        {draft.equipment.map((row, i) => (
          <div key={i} className="equipment-row">
            <div className="input-grid">
              <label>
                Equipment slot {i + 1}
                <select
                  aria-label={`Equipment slot ${i + 1}`}
                  value={row.slot}
                  onChange={(e) => equip(i, "slot", e.target.value)}
                >
                  {slots.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Item ID {i + 1}
                <input
                  pattern="[A-Z0-9_@]+"
                  maxLength={100}
                  value={row.itemId}
                  onChange={(e) => equip(i, "itemId", e.target.value.toUpperCase())}
                />
              </label>
              <label>
                Quality {i + 1}
                <select
                  aria-label={`Quality ${i + 1}`}
                  value={row.quality}
                  onChange={(e) => equip(i, "quality", Number(e.target.value))}
                >
                  {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"].map((q, j) => (
                    <option key={q} value={j + 1}>
                      {q}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Abilities / passives {i + 1}
                <input
                  maxLength={1000}
                  value={row.abilities}
                  onChange={(e) => equip(i, "abilities", e.target.value)}
                />
              </label>
              <label>
                Alternatives / swaps {i + 1}
                <input
                  maxLength={1000}
                  value={row.alternatives}
                  onChange={(e) => equip(i, "alternatives", e.target.value)}
                />
              </label>
            </div>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                update(
                  "equipment",
                  draft.equipment.filter((_, j) => j !== i),
                )
              }
            >
              Remove {row.slot}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={draft.equipment.length >= 10}
          onClick={() => {
            const slot = slots.find((s) => !draft.equipment.some((r) => r.slot === s));
            if (slot)
              update("equipment", [
                ...draft.equipment,
                {
                  slot,
                  itemId: "",
                  quality: 1,
                  abilities: "",
                  alternatives: "",
                  abilitySelections: {},
                  alternativeItemIds: [],
                },
              ]);
          }}
        >
          Add equipment slot
        </button>
      </details>
      <details className="build-notes">
        <summary>Strategy & revision notes</summary>
        <label>
          Strategy, advantages, weaknesses and matchup notes
          <textarea
            rows={8}
            maxLength={12000}
            value={draft.strategy}
            onChange={(e) => update("strategy", e.target.value)}
          />
        </label>
        <label className="section">
          Patch / version notes
          <textarea
            maxLength={2000}
            value={draft.patchNotes}
            onChange={(e) => update("patchNotes", e.target.value)}
          />
        </label>
      </details>
      {error && (
        <p className="error" role="alert">
          {error} <Link href="/signin">Account access</Link>
        </p>
      )}
      <div className="actions section">
        <Link className="button secondary" href="/builds">
          Back to builds
        </Link>
        {id && (
          <button
            type="button"
            className="button secondary negative"
            onClick={async () => {
              if (!window.confirm("Permanently delete this build and all revisions?")) return;
              setSaving(true);
              try {
                const response = await fetch(`/api/builds/${id}`, { method: "DELETE" });
                if (!response.ok) throw new Error("Could not delete build");
                router.push("/builds");
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not delete build");
              } finally {
                setSaving(false);
              }
            }}
          >
            Delete build
          </button>
        )}
      </div>
    </form>
  );
}
