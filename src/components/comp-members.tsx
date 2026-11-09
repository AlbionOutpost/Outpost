"use client";
import "@/app/landing-window.css";
import type { CSSProperties, ReactNode } from "react";
import Link from "@/components/build-region-link";
import { ItemIcon } from "./item-icon";
import type { RosterMember } from "./comp-roster";
import windows from "./landing/windows.module.css";
import styles from "./comps.module.css";

export type CompMemberCard = {
  member: RosterMember;
  /** The window's title: the member's build or player. */
  title: string;
  /** Where the title and the foot lead (a library member's build page). */
  href?: string;
  /** Chips after the role on the window bar (Optional…). */
  badges?: ReactNode;
  /** The planner foot's second line under the weapon name. */
  line?: string;
  body: ReactNode;
};

/** One member as the landing's window: number and title on the bar, the board, a foot row. */
export function CompMemberWindow({
  card,
  n,
  action,
  framed = true,
}: {
  card: CompMemberCard;
  n: number;
  /** False inside a panel: the window is a well, never a second surface. */
  framed?: boolean;
  /** A control that covers the whole window (the planner's Edit button). */
  action?: ReactNode;
}) {
  const weapon = card.member.weapon;
  return (
    <article
      className={`${framed ? `raised${card.href ? " is-link" : ""} ` : `${styles.unframed} `}landing-window ${windows.window} ${styles.memberWindow}`}
      data-scene={framed ? "composition" : undefined}
      aria-label={`Member ${n}`}
    >
      <div className={`landing-window-bar ${windows.bar}`}>
        <span className={`landing-window-title ${styles.memberTitle}`} title={card.title}>
          <span className={styles.memberN}>{n}</span>
          {card.href ? <Link href={card.href}>{card.title}</Link> : <span>{card.title}</span>}
        </span>
        <span className={`landing-chips ${styles.chips}`}>
          <span className={`landing-chip ${styles.roleChip}`}>{card.member.role}</span>
          {card.badges}
        </span>
      </div>
      <div className={`landing-window-body ${windows.body} ${styles.memberBody}`}>{card.body}</div>
      {/* The planner's foot carries the Edit control; read-only windows end with the board */}
      {action && (
        <div className={`landing-window-foot ${windows.foot} ${styles.memberFoot}`}>
          <span className={styles.footWeapon} aria-hidden="true">
            {weapon ? <ItemIcon id={weapon.itemId} quality={weapon.quality} size={40} /> : null}
          </span>
          <span>
            <strong>{card.member.name}</strong>
            <small>{card.line ?? card.member.role}</small>
          </span>
          {action}
        </div>
      )}
    </article>
  );
}

/** How many member windows share a row on wide screens: every row full or balanced, never 5+1. */
export function partyColumns(count: number) {
  if (count <= 4) return Math.max(count, 1);
  if (count === 7 || count === 8) return 4;
  if (count <= 9) return 3;
  return 5;
}
/** Small laptops: the wide layout up to four across; larger parties take four or three across,
 * whichever leaves the fuller last row. */
function mediumColumns(count: number) {
  if (count <= 9) return Math.min(partyColumns(count), 4);
  const fill = (cols: number) => (count % cols === 0 ? 1 : (count % cols) / cols);
  return fill(4) >= fill(3) ? 4 : 3;
}

/**
 * Every member of a comp as its own build window, laid out by party size: 5 is 3 + 2, 7 is
 * 4 + 3, 10 is 5 + 5, a short last row centred. Three across at most on small laptops, two on
 * tablets, one on phones.
 */
export function CompParty({
  label,
  members,
}: {
  label: string;
  members: { key: string; tone?: string; window: ReactNode }[];
}) {
  const count = members.length;
  return (
    <ol
      className={styles.partyGrid}
      aria-label={label}
      data-count={count}
      style={
        {
          "--party-cols": partyColumns(count),
          "--party-cols-md": mediumColumns(count),
          "--party-cols-sm": Math.min(count, 2),
        } as CSSProperties
      }
    >
      {members.map((member) => (
        <li
          key={member.key}
          className={styles.partyMember}
          data-role={member.tone}
          data-comp-member=""
        >
          {member.window}
        </li>
      ))}
    </ol>
  );
}
