"use client";
import { ItemIcon } from "./item-icon";
import { EquipmentGlyph } from "./equipment-overview";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import type { MemberSlot } from "@/lib/compositions/validation";
const slots = [
  "Helmet",
  "Chest",
  "Boots",
  "Main hand",
  "Off hand",
  "Cape",
  "Food",
  "Potion",
  "Mount",
];
export function PartyBoard({
  members,
  title,
  onSelect,
  active,
}: {
  members: MemberSlot[];
  title: string;
  onSelect?: (index: number) => void;
  active?: number;
}) {
  const balanced = members.length === 5;
  const heading = (
    <div className="party-board-title">
      <span className="eyebrow">{members.length} PLAYER LOADOUTS</span>
      <h2>{title || "Your party, at a glance."}</h2>
      <p>
        {onSelect ? "Select a player to edit their loadout." : "Equipment, roles and assignments."}
      </p>
    </div>
  );
  return (
    <section
      className="party-board"
      data-party-size={members.length}
      aria-label="Visual party loadouts"
    >
      {!balanced && heading}
      <div className="party-board-grid">
        {balanced && heading}
        {members.map((member, i) => {
          const content = (
            <>
              <div className="party-card-heading">
                <span className="member-index">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <strong>
                    {member.role === "Custom" ? member.customRole || "Custom" : member.role}
                  </strong>
                  <span>{member.playerName || "Unassigned player"}</span>
                </div>
                <span
                  className={`party-role-mark role-${member.role.toLowerCase().replaceAll(" ", "-")}`}
                  aria-hidden="true"
                />
              </div>
              <div className="party-gear-matrix">
                {slots.map((slot) => {
                  const item = member.equipment.find((e) => e.slot === slot);
                  return (
                    <span
                      key={slot}
                      data-slot={slot}
                      className={`party-gear-cell${item ? " filled" : ""}`}
                      title={item ? `${slot}: ${equipmentName(item.itemId)}` : `${slot}: Empty`}
                    >
                      <span className="sr-only">
                        {slot}: {item ? equipmentName(item.itemId) : "Empty"}
                      </span>
                      {item ? (
                        <ItemIcon id={item.itemId} quality={item.quality} size={54} />
                      ) : (
                        <EquipmentGlyph slot={slot} />
                      )}
                    </span>
                  );
                })}
              </div>
              {!!member.equipmentSets?.length && (
                <span className="muted">{member.equipmentSets.length} spare sets</span>
              )}
              <div className="party-card-status">
                <span>{member.playerName ? "Assigned" : "Unassigned"}</span>
                <span>
                  {member.equipment.some((e) => e.alternatives.length)
                    ? "Swaps available"
                    : member.mandatory
                      ? "Required"
                      : "Optional"}
                </span>
              </div>
            </>
          );
          return onSelect ? (
            <button
              key={member.id}
              type="button"
              className="party-loadout-card"
              aria-pressed={active === i}
              onClick={() => onSelect(i)}
            >
              <span className="sr-only">Edit player {i + 1} loadout: </span>
              {content}
            </button>
          ) : (
            <article className="party-loadout-card" key={member.id}>
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}
