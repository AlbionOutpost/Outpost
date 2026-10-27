import { ItemIcon } from "./item-icon";
import { EquipmentGlyph } from "./equipment-overview";
import { equipmentName } from "@/lib/albion/equipment-catalog";
export function EquipmentStrip({
  equipment,
  size = 34,
}: {
  equipment: { slot: string; itemId: string; quality: number }[];
  size?: number;
}) {
  return (
    <span className="equipment-strip" aria-label="Loadout preview">
      {["Main hand", "Helmet", "Chest", "Boots", "Food", "Potion"].map((slot) => {
        const e = equipment.find((e) => e.slot === slot);
        return (
          <span
            className={`strip-slot${e ? " filled" : ""}`}
            key={slot}
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
