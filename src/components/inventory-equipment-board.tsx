"use client";
import { useId } from "react";
import { InventorySlotGlyph } from "./inventory-slot-glyph";
import { ItemIcon } from "./item-icon";
import { SpellIcon } from "./spell-icon";
import { buildInventoryLayout } from "@/lib/build-inventory-layout";
export type InventoryEquipmentItem = {
  slot: string;
  itemId: string;
  quality: number;
  name?: string;
  tierLabel?: string;
  qualityLabel?: string;
  spells?: readonly { id?: string; name: string; key?: string }[];
  alternativeItemId?: string;
};

export function InventoryEquipmentBoard({
  equipment,
  selectedSlot,
  onSelectSlot,
  label = "Equipment inventory",
}: {
  equipment: readonly InventoryEquipmentItem[];
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
  label?: string;
}) {
  const prefix = useId();
  return (
    <div
      className={`inventory-equipment-board anatomical-inventory${equipment.some((item) => item.itemId) ? " has-equipment" : " is-empty-board"}`}
      role="group"
      aria-label={label}
    >
      <svg
        className="inventory-body-silhouette"
        viewBox="0 0 180 330"
        aria-hidden="true"
        focusable="false"
        data-inventory-silhouette="true"
      >
        <g fill="currentColor">
          <ellipse cx="90" cy="28" rx="17" ry="22" />
          <path d="M81 47h18l3 14 22 9 13 25 20 48-9 5-26-39-7-14 1 53-8 25H72l-8-25 1-53-7 14-26 39-9-5 20-48 13-25 22-9z" />
          <path d="M72 168h36l9 25-8 55-4 50H91l-1-89-1 89H75l-4-50-8-55z" />
          <path d="M75 293h15l-2 20H63v-8zM91 293h14l12 12v8H93zM23 140l10 3-2 19-6 7-6-4zM147 143l10-3 4 25-6 4-6-7z" />
        </g>
        <path
          className="inventory-body-seam"
          d="M90 65v92M71 150h38M90 177v24M65 82l-10 21M115 82l10 21"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      {buildInventoryLayout.map(({ slot, area, row, column }) => {
        const item = equipment.find((row) => row.slot === slot && row.itemId);
        const name = item?.name || item?.itemId || "Empty";
        const tooltip = `${prefix}-${slot.replaceAll(" ", "-")}`;
        return (
          <div
            className="inventory-equipment-cell"
            key={slot}
            data-area={area}
            style={{ gridRow: row + 1, gridColumn: column + 1 }}
          >
            <button
              type="button"
              data-slot={slot}
              data-area={area}
              className={`inventory-equipment-slot${item ? " is-equipped" : " is-empty"}${selectedSlot === slot ? " is-selected" : ""}`}
              aria-pressed={selectedSlot === slot}
              aria-label={`Inspect ${slot}: ${name}`}
              aria-describedby={tooltip}
              onClick={() => onSelectSlot(slot)}
            >
              <span className="inventory-slot-caption">{slot}</span>
              <span className="inventory-slot-art">
                {item ? (
                  <ItemIcon id={item.itemId} quality={item.quality} size={80} />
                ) : (
                  <InventorySlotGlyph slot={slot} />
                )}
                {!!item?.spells?.some((spell) => spell.id) && (
                  <span className="inventory-slot-spells" aria-hidden="true">
                    {item.spells
                      .filter((spell) => spell.id)
                      .slice(0, 4)
                      .map((spell, i) => (
                        <SpellIcon
                          key={`${spell.id}-${i}`}
                          id={spell.id!}
                          name={spell.name}
                          size={20}
                        />
                      ))}
                  </span>
                )}
                {item?.alternativeItemId && (slot === "Food" || slot === "Potion") && (
                  <span className="inventory-slot-swap" aria-hidden="true">
                    <ItemIcon id={item.alternativeItemId} size={30} />
                  </span>
                )}
              </span>
            </button>
            <span id={tooltip} role="tooltip" className="inventory-slot-tooltip">
              <strong>
                {slot} · {name}
              </strong>
              {item ? (
                <>
                  <span>
                    {[item.tierLabel, item.qualityLabel || `Quality ${item.quality}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {!!item.spells?.length && (
                    <span>{item.spells.map((spell) => spell.name).join(" · ")}</span>
                  )}
                </>
              ) : (
                <span>No item equipped. Select to inspect this slot.</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
