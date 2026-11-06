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
export function EquipmentSets({
  equipment,
  sets,
  onEquipment,
  onSets,
  expanded = false,
  part,
}: {
  equipment: EquipmentChoice[];
  sets: EquipmentSet[];
  onEquipment: (rows: EquipmentChoice[]) => void;
  onSets: (sets: EquipmentSet[]) => void;
  expanded?: boolean;
  /** Expanded only: show the starting templates or the spare sets as their own panel. */
  part?: "templates" | "spares";
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
  // The build editor shows templates and spare sets as two working panels; the comp editor
  // keeps them folded in its member dialog.
  if (expanded && part === "templates")
    return (
      <section className="equipment-set-tools is-expanded" aria-label="Starting sets">
        <div className="raised editor-sets-panel">
          <PanelHead
            title="Starting sets"
            line="Fill every slot from a template, then change what you need. Abilities stay yours to pick."
          />
          <div className="editor-template-browser" role="group" aria-label="Loadout templates">
            {loadoutTemplates.map((item) => (
              <article key={item.id}>
                <div className="editor-template-art">
                  {item.items.slice(0, 4).map(([slot, itemId]) => (
                    <ItemIcon key={slot} id={itemId} size={42} />
                  ))}
                </div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    restore({
                      id: crypto.randomUUID(),
                      name: item.name,
                      equipment: templateEquipment(item.id),
                    })
                  }
                >
                  Use {item.name}
                </button>
              </article>
            ))}
          </div>
          {message && <StatusLine>{message}</StatusLine>}
        </div>
      </section>
    );
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
            <select value={template} onChange={(e) => setTemplate(e.target.value)}>
              {loadoutTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
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
