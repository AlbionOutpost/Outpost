import Link from "next/link";
import { ItemIcon } from "./item-icon";
import { EquipmentGlyph } from "./equipment-overview";
import { equipmentSlots, equipmentName } from "@/lib/albion/equipment-catalog";
type Gear = {
  slot: string;
  itemId: string;
  quality: number;
  abilities: string;
  alternatives: string;
  abilitySelections: unknown;
  alternativeItemIds: string[];
};
export function BuildLoadoutView({ equipment, region }: { equipment: Gear[]; region: string }) {
  return (
    <section className="build-loadout-view" aria-label="Build equipment and abilities">
      <div className="build-loadout-inventory">
        <span className="eyebrow">EQUIPMENT</span>
        <h2>The loadout</h2>
        <div className="character-slots">
          {equipmentSlots.map((slot) => {
            const item = equipment.find((e) => e.slot === slot);
            return (
              <a
                key={slot}
                href={item ? `#build-gear-${slot.replaceAll(" ", "-")}` : undefined}
                className={`character-slot${item ? " equipped" : ""}`}
                data-slot={slot}
                title={`${slot}: ${item ? equipmentName(item.itemId) : "Empty"}`}
              >
                <span className="slot-caption">{slot}</span>
                {item ? (
                  <ItemIcon id={item.itemId} quality={item.quality} size={72} />
                ) : (
                  <EquipmentGlyph slot={slot} />
                )}
                <span className="slot-item-name">
                  {item ? equipmentName(item.itemId) : "Empty"}
                </span>
              </a>
            );
          })}
        </div>
      </div>
      <div className="build-loadout-abilities">
        <span className="eyebrow">ITEMS, ABILITIES & SWAPS</span>
        <h2>Equipment details</h2>
        {equipment.map((e) => (
          <article
            key={e.slot}
            id={`build-gear-${e.slot.replaceAll(" ", "-")}`}
            className="loadout-ability-row"
          >
            <div className="selected-gear-heading">
              <ItemIcon id={e.itemId} quality={e.quality} size={52} />
              <div>
                <span className="eyebrow">{e.slot}</span>
                <h3>{equipmentName(e.itemId)}</h3>
                <small>
                  {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][e.quality - 1] ||
                    "Unknown quality"}
                </small>
              </div>
              <Link
                className="text-link"
                href={`/tools/market?region=${region}&item=${encodeURIComponent(e.itemId)}`}
              >
                Compare prices →
              </Link>
            </div>
            {Object.keys(e.abilitySelections as Record<string, string>).length > 0 && (
              <p className="loadout-spells">
                Recorded selections:{" "}
                {Object.entries(e.abilitySelections as Record<string, string>)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </p>
            )}
            {e.abilities && <p className="preserve">Abilities: {e.abilities}</p>}
            {e.alternatives && <p className="preserve">Alternatives: {e.alternatives}</p>}
            {e.alternativeItemIds.length > 0 && (
              <div className="loadout-swaps">
                {e.alternativeItemIds.map((id) => (
                  <span key={id}>
                    <ItemIcon id={id} size={36} />
                    {equipmentName(id)}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
        {!equipment.length && <p>No equipment has been assigned.</p>}
      </div>
    </section>
  );
}
