"use client";
import { ArrowRight } from "lucide-react";
import type { MemberSlot } from "@/lib/compositions/validation";
import { slotRosterMember } from "@/lib/compositions/roster";
import { LoadoutBoard } from "./loadout-board";
import { RosterRowCells } from "./comp-roster";
import { CompMemberWindow } from "./comp-members";
import windows from "./landing/windows.module.css";
import styles from "./comps.module.css";

/**
 * The planner's party: every member as the landing's window with its loadout on the board, three
 * across; the whole window opens that member's editor. Phones show the members as roster rows.
 */
export function PartyBoard({
  members,
  onSelect,
  active,
}: {
  members: MemberSlot[];
  onSelect: (index: number) => void;
  active?: number;
}) {
  return (
    <div className={windows.windows}>
      <ol className={styles.members} aria-label="Visual party loadouts">
        {members.map((member, i) => {
          const row = slotRosterMember(member);
          const label = `Edit player ${i + 1} loadout: ${member.playerName || `Slot ${i + 1}`}`;
          return (
            <li key={member.id} className={styles.member} data-role={row.tone} data-party-card="">
              <button
                type="button"
                className={styles.partyRow}
                aria-pressed={active === i}
                aria-label={label}
                onClick={() => onSelect(i)}
              >
                <RosterRowCells member={row} n={i + 1} />
                <ArrowRight className={styles.memberChevron} size={18} aria-hidden="true" />
              </button>
              <div className={styles.partyCard} data-active={active === i ? "" : undefined}>
                <CompMemberWindow
                  n={i + 1}
                  card={{
                    member: row,
                    title: member.playerName || `Slot ${i + 1}`,
                    badges: !member.mandatory && (
                      <span className="landing-chip is-muted">Optional</span>
                    ),
                    line: member.equipmentSets.length
                      ? `${member.equipmentSets.length} spare ${member.equipmentSets.length === 1 ? "set" : "sets"}`
                      : member.equipment.length
                        ? `${member.equipment.length} of 10 slots`
                        : "No loadout yet",
                    body: (
                      <LoadoutBoard
                        pieces={member.equipment}
                        size="card"
                        abilities={false}
                        label={`Player ${i + 1} equipment`}
                      />
                    ),
                  }}
                  action={
                    <button
                      type="button"
                      className={styles.partyEdit}
                      aria-pressed={active === i}
                      aria-label={label}
                      onClick={() => onSelect(i)}
                    >
                      Edit <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  }
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
