"use client";
import { ArrowRight } from "lucide-react";
import type { MemberSlot } from "@/lib/compositions/validation";
import { memberRole, slotRosterMember } from "@/lib/compositions/roster";
import { LoadoutBoard } from "./loadout-board";
import { RosterRowCells } from "./comp-roster";
import styles from "./comps.module.css";

/**
 * The planner's party: every member as a framed window with its loadout on the game's board, each
 * one a button that opens that member's editor. Phones show the same members as roster rows.
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
    <ol
      className={styles.members}
      aria-label="Visual party loadouts"
      style={members.length === 5 ? { ["--columns" as string]: 5 } : undefined}
    >
      {members.map((member, i) => {
        const row = slotRosterMember(member);
        return (
          <li key={member.id} className={styles.member} data-role={row.tone} data-party-card="">
            <button
              type="button"
              className={styles.partyCard}
              aria-pressed={active === i}
              onClick={() => onSelect(i)}
            >
              <span className="sr-only">Edit player {i + 1} loadout: </span>
              <span className={styles.partyRow}>
                <RosterRowCells member={row} n={i + 1} />
              </span>
              <span className={`raised has-scene ${styles.memberWindow}`} data-scene="composition">
                <span className={styles.memberEdge} aria-hidden="true" />
                <span className={styles.memberBar}>
                  <span className={styles.memberN}>{i + 1}</span>
                  <span className={styles.memberRole}>{memberRole(member)}</span>
                  {!member.mandatory && <span className="landing-chip is-muted">Optional</span>}
                </span>
                <span className={styles.memberTitle}>{member.playerName || `Slot ${i + 1}`}</span>
                <span className={styles.memberBoard}>
                  <LoadoutBoard
                    pieces={member.equipment}
                    size="mini"
                    abilities={false}
                    label={`Player ${i + 1} equipment`}
                  />
                </span>
                <span className={styles.partyFoot}>
                  <span>
                    {member.equipmentSets.length
                      ? `${member.equipmentSets.length} spare ${member.equipmentSets.length === 1 ? "set" : "sets"}`
                      : member.equipment.some((e) => e.alternatives.length)
                        ? "Swaps set"
                        : member.equipment.length
                          ? `${member.equipment.length} of 10 slots`
                          : "No loadout yet"}
                  </span>
                  <span className={styles.captionGo}>
                    Edit <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
