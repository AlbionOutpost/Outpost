import { ItemIcon } from "./item-icon";
import { EquipmentGlyph } from "./equipment-overview";
import { equipmentName } from "@/lib/albion/equipment-catalog";
export function EquipmentStrip({
  equipment,
  size = 34,
  slots = ["Main hand", "Helmet", "Chest", "Boots", "Food", "Potion"],
  hideEmpty = false,
}: {
  equipment: { slot: string; itemId: string; quality: number }[];
  size?: number;
  slots?: readonly string[];
  hideEmpty?: boolean;
}) {
  return (
    <span className="equipment-strip" aria-label="Loadout preview">
      {slots.map((slot) => {
        const e = equipment.find((e) => e.slot === slot);
        if (hideEmpty && !e?.itemId) return null;
        return (
          <span
            className={`strip-slot${e ? " filled" : ""}`}
            key={slot}
            data-slot={slot}
            title={e ? `${slot}: ${equipmentName(e.itemId)}` : `${slot}: Empty`}
            aria-label={e ? `${slot}: ${equipmentName(e.itemId)}` : `${slot}: Empty`}
          >
            {e ? (
              <ItemIcon id={e.itemId} quality={e.quality} size={size} />
            ) : (
              <EquipmentGlyph slot={slot} />
            )}
          </span>
        );
      })}
    </span>
  );
}
