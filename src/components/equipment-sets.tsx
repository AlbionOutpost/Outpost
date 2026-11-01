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
  return (
    <section className="equipment-set-tools" aria-label="Equipment sets and templates">
      <details open={expanded || undefined}>
        <summary>
          Templates & spare sets <span>{sets.length}/5 saved</span>
        </summary>
        {expanded && (
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
        )}
        {!expanded && (
          <>
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
          </>
        )}
        <div className="set-template-controls">
          <label>
            Spare set name
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
                    className="button secondary"
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
      </details>
      <p role="status" className="muted">
        {message}
      </p>
    </section>
  );
}
