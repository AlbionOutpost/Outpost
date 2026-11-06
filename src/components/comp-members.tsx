"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { RosterRowCells, type RosterMember } from "./comp-roster";
import styles from "./comps.module.css";

export type CompMemberCard = {
  member: RosterMember;
  /** The window's title: the member's build or player. */
  title: ReactNode;
  /** Chips after the role on the window bar (Optional, Substitute…). */
  badges?: ReactNode;
  body: ReactNode;
};

/**
 * Every member of a comp. Wide screens show each as a framed window with its loadout; phones
 * show the comp as the landing's roster rows, and a tap opens that member's window under its row
 * (a 25-member comp stays one screen of rows instead of 25 stacked boards).
 */
export function CompMembers({ cards, label }: { cards: CompMemberCard[]; label: string }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  return (
    // A party of five reads as one row, as the game's party frame does
    <ol
      className={styles.members}
      aria-label={label}
      style={cards.length === 5 ? ({ "--columns": 5 } as CSSProperties) : undefined}
    >
      {cards.map((card, i) => {
        const key = card.member.key;
        const expanded = open.has(key);
        const id = `member-${i + 1}`;
        return (
          <li key={key} className={styles.member} data-role={card.member.tone} data-comp-member="">
            <button
              type="button"
              className={styles.memberToggle}
              aria-expanded={expanded}
              aria-controls={id}
              onClick={() =>
                setOpen((current) => {
                  const next = new Set(current);
                  if (expanded) next.delete(key);
                  else next.add(key);
                  return next;
                })
              }
            >
              <span className="sr-only">
                {expanded ? "Hide" : "Show"} member {i + 1}:{" "}
              </span>
              <RosterRowCells member={card.member} n={i + 1} />
              <ChevronDown className={styles.memberChevron} size={18} aria-hidden="true" />
            </button>
            <article
              id={id}
              className={`raised has-scene ${styles.memberWindow}`}
              data-scene="composition"
              data-open={expanded ? "" : undefined}
              aria-label={`Member ${i + 1}`}
            >
              <span className={styles.memberEdge} aria-hidden="true" />
              <div className={styles.memberBar}>
                <span className={styles.memberN}>{i + 1}</span>
                <span className={styles.memberRole}>{card.member.role}</span>
                {card.badges}
              </div>
              <h3 className={styles.memberTitle}>{card.title}</h3>
              <div className={styles.memberBody}>{card.body}</div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
