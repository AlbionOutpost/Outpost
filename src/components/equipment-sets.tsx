"use client";
import { useState } from "react";
import {
  equipmentSet,
  loadoutTemplates,
  templateEquipment,
  type EquipmentSet,
} from "@/lib/albion/equipment-sets";
import type { EquipmentChoice } from "@/lib/compositions/validation";
import { EquipmentStrip } from "./equipment-strip";
import { ItemIcon } from "./item-icon";
import { PanelHead } from "./panel-head";
import { StatusLine } from "./status-line";
import { WellSelect } from "./well-select";
export function EquipmentSets({
  equipment,
  sets,
  onEquipment,
  onSets,
  expanded = false,
}: {
  equipment: EquipmentChoice[];
  sets: EquipmentSet[];
  onEquipment: (rows: EquipmentChoice[]) => void;
  onSets: (sets: EquipmentSet[]) => void;
  expanded?: boolean;
}) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("battleaxe");
  const [message, setMessage] = useState("");
  function restore(set: EquipmentSet) {
    if (
      equipment.length &&
      !window.confirm(
        "Replace the active equipment with this set? Save your active set first if you want to keep it.",
      )
    )
      return;
    onEquipment(structuredClone(set.equipment));
    setMessage(`${set.name} applied. Save the build or comp to persist your changes.`);
  }
  const spareControls = (
    <div className="set-template-controls">
      <label>
        <span>Spare set name</span>
        <input
          maxLength={60}
          placeholder="Boss swap, budget set, substitute…"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        disabled={!equipment.length || sets.length >= 5}
        onClick={() => {
          const parsed = equipmentSet.safeParse({ id: crypto.randomUUID(), name, equipment });
          if (!parsed.success) {
            setMessage("Name the set and select supported equipment first.");
            return;
          }
          onSets([...sets, structuredClone(parsed.data)]);
          setName("");
          setMessage("Spare set added to the draft. Save the build or comp to keep it.");
        }}
      >
        Save active as spare set
      </button>
    </div>
  );
  const savedSets = (
    <div className="saved-equipment-sets">
      {sets.map((set) => (
        <article key={set.id}>
          <div className="section-heading">
            <h3>{set.name}</h3>
            <div className="actions">
              <button
                type="button"
                className="button secondary"
                aria-label={`Apply set: ${set.name}`}
                onClick={() => restore(set)}
              >
                Apply set
              </button>
              <button
                type="button"
                className="button secondary editor-remove-item"
                aria-label={`Remove ${set.name} set`}
                onClick={() => {
                  onSets(sets.filter((s) => s.id !== set.id));
                  setMessage("Spare set removed from the draft.");
                }}
              >
                Remove
              </button>
            </div>
          </div>
          <EquipmentStrip equipment={set.equipment} />
          <small>
            {set.equipment.length}/10 slots · abilities, quality and item alternatives included
          </small>
        </article>
      ))}
    </div>
  );
  // The build editor shows spare sets as a working panel and the starting sets on its empty
  // board (`StartingSets`); the comp editor keeps both folded in its member dialog.
  if (expanded)
    return (
      <section className="equipment-set-tools is-expanded" aria-label="Spare sets">
        <div className="raised editor-sets-panel">
          <PanelHead
            title="Spare sets"
            line="Save the whole loadout as a named set, like a boss swap or a budget version."
            actions={<span className="landing-chip is-muted">{sets.length}/5 saved</span>}
          />
          {spareControls}
          {sets.length ? (
            savedSets
          ) : (
            <p className="editor-muted">No spare sets yet. The current loadout is the only one.</p>
          )}
          {message && <StatusLine>{message}</StatusLine>}
        </div>
      </section>
    );
  return (
    <section className="equipment-set-tools" aria-label="Equipment sets and templates">
      <details>
        <summary>
          Templates & spare sets <span>{sets.length}/5 saved</span>
        </summary>
        <div className="set-template-controls">
          <label>
            Starting template
            <WellSelect value={template} onChange={(e) => setTemplate(e.target.value)}>
              {loadoutTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </WellSelect>
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={() =>
              restore({
                id: crypto.randomUUID(),
                name: loadoutTemplates.find((t) => t.id === template)!.name,
                equipment: templateEquipment(template),
              })
            }
          >
            Apply template
          </button>
        </div>
        <p className="muted">{loadoutTemplates.find((t) => t.id === template)?.description}</p>
        {spareControls}
        {savedSets}
      </details>
      <p role="status" className="muted">
        {message}
      </p>
    </section>
  );
}

/** The empty board's one start: fill every slot from a template, then change what you need. */
export function StartingSets({
  onPick,
}: {
  onPick: (id: string, rows: EquipmentChoice[]) => void;
}) {
  return (
    <div className="editor-starting-sets" role="group" aria-labelledby="editor-starting-sets">
      <small id="editor-starting-sets">Or start from a set</small>
      <div>
        {loadoutTemplates.map((item) => (
          <button
            type="button"
            key={item.id}
            title={item.description}
            onClick={() => onPick(item.id, templateEquipment(item.id))}
          >
            <span aria-hidden="true">
              {item.items.slice(0, 3).map(([slot, itemId]) => (
                <ItemIcon key={slot} id={itemId} size={28} />
              ))}
            </span>
            {/* Named by what it shows, with the words the card leaves out read aloud */}
            <span className="sr-only">Use </span>
            <strong>{item.name.replace(/ (equipment|starting) set$/, "")}</strong>
            <span className="sr-only">
              {item.name.match(/ (equipment|starting) set$/)?.[0]}
            </span>{" "}
            <small>{item.items.length} slots</small>
          </button>
        ))}
      </div>
    </div>
  );
}
