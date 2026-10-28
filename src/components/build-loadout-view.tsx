import { EquipmentMarketLink } from "./archive-build-links";
import { ItemIcon } from "./item-icon";
import { EquipmentGlyph } from "./equipment-overview";
import { equipmentSlots, equipmentName } from "@/lib/albion/equipment-catalog";
import { archivedSpellOptions } from "@/lib/albion/equipment-abilities";
import { SpellIcon } from "./spell-icon";
type Gear = {
  slot: string;
  itemId: string;
  quality: number;
  abilities: string;
  alternatives: string;
  abilitySelections: unknown;
  alternativeItemIds: string[];
  recordedSkills?: { id: string; name: string }[];
  alternativeRecordedSkills?: Record<string, { id: string; name: string }[]>;
};
export function BuildLoadoutView({ equipment, region }: { equipment: Gear[]; region?: string }) {
  return (
    <section
      className="build-loadout-view"
      id="build-equipment"
      aria-label="Build equipment and abilities"
    >
      <div className="build-loadout-inventory">
        <div className="loadout-surface-heading">
          <h2>The loadout</h2>
          <span>{equipment.filter((item) => item.itemId).length}/10 equipped</span>
        </div>
        <div className="character-slots">
          {equipmentSlots.map((slot) => {
            const item = equipment.find((e) => e.slot === slot && e.itemId);
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
                  <ItemIcon id={item.itemId} quality={item.quality} size={64} />
                ) : (
                  <EquipmentGlyph slot={slot} />
                )}
                <span className="slot-item-name">
                  {item ? equipmentName(item.itemId) : "Empty"}
                </span>
                {!!item?.recordedSkills?.length && (
                  <span className="studio-tile-spells">
                    {item.recordedSkills.map((spell) => (
                      <span key={spell.id} title={spell.name}>
                        <SpellIcon id={spell.id} name={spell.name} size={22} />
                      </span>
                    ))}
                  </span>
                )}
              </a>
            );
          })}
        </div>
        <p className="loadout-inventory-note">
          Select equipped gear to inspect its recorded abilities and alternatives.
        </p>
      </div>
      <div className="build-loadout-abilities">
        <div className="loadout-surface-heading">
          <h2>Equipment & abilities</h2>
          <span>Recorded selections</span>
        </div>
        {equipment
          .filter((item) => item.itemId)
          .sort(
            (a, b) =>
              equipmentSlots.indexOf(a.slot as (typeof equipmentSlots)[number]) -
              equipmentSlots.indexOf(b.slot as (typeof equipmentSlots)[number]),
          )
          .map((e) => {
            const abilities =
              e.abilitySelections &&
              typeof e.abilitySelections === "object" &&
              !Array.isArray(e.abilitySelections)
                ? Object.entries(e.abilitySelections).filter(
                    (entry): entry is [string, string] =>
                      typeof entry[1] === "string" && !!entry[1],
                  )
                : [];
            return (
              <article
                key={e.slot}
                id={`build-gear-${e.slot.replaceAll(" ", "-")}`}
                className="loadout-ability-row"
              >
                <div className="loadout-recommended-column">
                  <div className="selected-gear-heading">
                    <ItemIcon id={e.itemId} quality={e.quality} size={48} />
                    <div>
                      <span className="loadout-slot-label">{e.slot}</span>
                      <h3>{equipmentName(e.itemId)}</h3>
                      <small>
                        {["Normal", "Good", "Outstanding", "Excellent", "Masterpiece"][
                          e.quality - 1
                        ] || "Unknown quality"}
                      </small>
                    </div>
                    <EquipmentMarketLink itemId={e.itemId} quality={e.quality} region={region} />
                  </div>
                  {abilities.length > 0 && (
                    <div className="loadout-spells" aria-label={`${e.slot} recorded abilities`}>
                      {abilities.map(([slot, ability]) => (
                        <span className="loadout-ability-chip" key={slot}>
                          {(() => {
                            const spell = archivedSpellOptions(e.itemId).find(
                              (s) => s.key === slot && s.name === ability,
                            );
                            return spell ? (
                              <SpellIcon id={spell.id} name={spell.name} size={24} />
                            ) : null;
                          })()}
                          <b>{slot}</b>
                          <span>{ability}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {!!e.recordedSkills?.length && (
                    <div className="loadout-spells" aria-label={`${e.slot} recorded abilities`}>
                      {e.recordedSkills.map((spell) => (
                        <span key={spell.id} title={spell.name} className="loadout-archived-spell">
                          <SpellIcon id={spell.id} name={spell.name} size={32} />
                          <span className="sr-only">{spell.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {e.abilities && (
                    <p className="preserve loadout-author-note">Ability notes: {e.abilities}</p>
                  )}
                  {e.alternatives && (
                    <p className="preserve loadout-author-note">
                      Alternative notes: {e.alternatives}
                    </p>
                  )}
                </div>
                {e.alternativeItemIds.length > 0 && (
                  <div className="loadout-swaps">
                    <span className="loadout-slot-label">Alternatives</span>
                    {e.alternativeItemIds.map((id) => (
                      <div key={id} className="loadout-recorded-alternative">
                        <span>
                          <ItemIcon id={id} size={40} />
                          <span>{equipmentName(id)}</span>
                        </span>
                        {!!e.alternativeRecordedSkills?.[id]?.length && (
                          <div
                            className="loadout-spells"
                            aria-label={`${e.slot} alternative recorded abilities`}
                          >
                            {e.alternativeRecordedSkills[id].map((spell, i) => (
                              <span
                                key={`${spell.id}-${i}`}
                                title={spell.name}
                                className="loadout-archived-spell"
                              >
                                <SpellIcon id={spell.id} name={spell.name} size={28} />
                                <span className="sr-only">{spell.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        {!equipment.some((item) => item.itemId) && (
          <p className="loadout-inventory-note">No equipment has been assigned.</p>
        )}
      </div>
    </section>
  );
}
