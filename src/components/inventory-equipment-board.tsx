"use client";
import { offHandShadow } from "@/lib/albion/two-handed";
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
  anchorPrefix,
}: {
  equipment: readonly InventoryEquipmentItem[];
  selectedSlot: string;
  onSelectSlot: (slot: string) => void;
  label?: string;
  anchorPrefix?: string;
}) {
  const prefix = useId();
  return (
    <div
      className={`inventory-equipment-board anatomical-inventory${equipment.some((item) => item.itemId) ? " has-equipment" : " is-empty-board"}`}
      role="group"
      aria-label={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied mark */}
      <img
        className="inventory-body-silhouette"
        data-slot-mark="figure"
        src="/albion/slots/figure.svg"
        alt=""
        aria-hidden="true"
        data-inventory-silhouette="true"
      />
      {buildInventoryLayout.map(({ slot, area, row, column }) => {
        const item = equipment.find((row) => row.slot === slot && row.itemId);
        // A two-handed main hand fills the off hand too; the game shows it there, faded.
        const shadow =
          slot === "Off hand" && !item
            ? offHandShadow(
                equipment.find((row) => row.slot === "Main hand" && row.itemId)?.itemId,
                null,
              )
            : null;
        const name = item?.name || item?.itemId || "Empty";
        const tooltip = `${prefix}-${slot.replaceAll(" ", "-")}`;
        return (
          <div
            id={anchorPrefix ? `${anchorPrefix}-${slot.replaceAll(" ", "-")}` : undefined}
            className="inventory-equipment-cell"
            key={slot}
            data-area={area}
            style={{ gridRow: row + 1, gridColumn: column + 1 }}
          >
            <button
              type="button"
              data-slot={slot}
              data-area={area}
              className={`inventory-equipment-slot${item ? " is-equipped" : shadow ? " is-two-handed" : " is-empty"}${selectedSlot === slot ? " is-selected" : ""}`}
              aria-pressed={selectedSlot === slot}
              aria-label={
                item
                  ? `Inspect ${slot}: ${name}`
                  : shadow
                    ? `Inspect ${slot}: held by the two-handed main hand`
                    : `Inspect ${slot} Empty`
              }
              aria-describedby={tooltip}
              onClick={() => onSelectSlot(slot)}
            >
              <span className="inventory-slot-caption">{slot}</span>
              <span className="inventory-slot-art">
                {item ? (
                  <ItemIcon id={item.itemId} quality={item.quality} size={80} />
                ) : shadow ? (
                  <span className="inventory-slot-shadow" aria-hidden="true">
                    <ItemIcon id={shadow} size={80} />
                  </span>
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
                          size={27}
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
              {!item && !shadow && (
                <>
                  {" "}
                  <span className="inventory-empty-caption">Empty</span>
                </>
              )}
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
