import type { EquipmentSet } from "@/lib/albion/equipment-sets";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { ItemIcon } from "./item-icon";
export function SavedEquipmentSets({ sets }: { sets: EquipmentSet[] }) {
  if (!sets.length) return null;
  return (
    <section className="saved-equipment-sets" aria-label="Saved spare equipment sets">
      <h2>Spare sets</h2>
      {sets.map((set) => (
        <details key={set.id}>
          <summary>
            {set.name} · {set.equipment.length}/10 slots
          </summary>
          <ul className="equipment-summary">
            {set.equipment.map((item) => (
              <li key={item.slot}>
                <ItemIcon id={item.itemId} quality={item.quality} size={40} />
                <strong>{item.slot}</strong>
                <span>
                  {equipmentName(item.itemId)} ·{" "}
                  {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][item.quality - 1]}
                </span>
                {Object.entries(item.abilities).map(([slot, spell]) => (
                  <small key={slot}>
                    {slot}: {spell}
                  </small>
                ))}
                {!!item.alternatives.length && (
                  <small>Swaps: {item.alternatives.map(equipmentName).join(", ")}</small>
                )}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
