"use client";
import { EquipmentSets } from "./equipment-sets";
import { EquipmentPicker } from "./equipment-picker";
import { findEquipment } from "@/lib/albion/equipment-catalog";
import type { EquipmentChoice } from "@/lib/compositions/validation";
import { useState } from "react";
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
}: {
  initial?: BuildInput;
  id?: string;
  version?: number;
}) {
  const [draft, setDraft] = useState<BuildInput>(initial || empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
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
        <button className="button primary" disabled={saving}>
          {saving ? "Saving…" : id ? "Save new revision" : "Save build"}
        </button>
      </div>
      <div className="build-editor-context">
        <span className="eyebrow">LOADOUT WORKBENCH</span>
        <span>
          {id
            ? `Revision ${version ?? 1} · save to create the next revision`
            : "New loadout · equip a slot to begin"}
        </span>
      </div>
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
            Content type
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
      <details className="advanced-build panel">
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
