"use client";
import "@/app/landing-window.css";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "@/components/build-region-link";
import { ItemIcon } from "./item-icon";
import { RosterRowCells, type RosterMember } from "./comp-roster";
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
  /** The foot's second line under the weapon name. */
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
  /** False inside a framed panel: the window is a well, with no second frame and gems. */
  framed?: boolean;
  /** A control that covers the whole window (the planner's Edit button). */
  action?: ReactNode;
}) {
  const weapon = card.member.weapon;
  return (
    <article
      className={`${framed ? "raised has-scene " : `${styles.unframed} `}landing-window ${windows.window} ${styles.memberWindow}`}
      data-scene={framed ? "composition" : undefined}
      aria-label={`Member ${n}`}
    >
      <span className={styles.memberEdge} aria-hidden="true" />
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
      <div className={`landing-window-foot ${windows.foot} ${styles.memberFoot}`}>
        <span className={styles.footWeapon} aria-hidden="true">
          {weapon ? <ItemIcon id={weapon.itemId} quality={weapon.quality} size={40} /> : null}
        </span>
        <span>
          <strong>{card.member.name}</strong>
          <small>{card.line ?? card.member.role}</small>
        </span>
        {action ??
          (card.href ? (
            <Link href={card.href} className={styles.footGo} aria-label={`Open ${card.title}`}>
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          ) : null)}
      </div>
    </article>
  );
}

/**
 * Every member of a comp. Wide screens show each as a framed window with its loadout on the
 * landing's board, three across; phones show the comp as one window of roster rows, and a tap
 * opens that member's board under its row (25 members stay one screen of rows, not 25 boards).
 */
export function CompMembers({
  cards,
  label,
  title,
}: {
  cards: CompMemberCard[];
  label: string;
  /** The phone window's title. */
  title: string;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  return (
    <div className={windows.windows}>
      <ol className={styles.members} aria-label={label}>
        {cards.map((card, i) => (
          <li
            key={card.member.key}
            className={styles.member}
            data-role={card.member.tone}
            data-comp-member=""
          >
            <CompMemberWindow card={card} n={i + 1} />
          </li>
        ))}
      </ol>
      <section
        className={`raised has-scene landing-window ${windows.window} ${styles.phoneRoster}`}
        data-scene="composition"
        aria-label={`${label} by row`}
      >
        <div className={`landing-window-bar ${windows.bar}`}>
          <span className="landing-window-title">{title}</span>
          <span className="landing-chips">
            <span className="landing-chip is-muted">
              {cards.length} {cards.length === 1 ? "member" : "members"}
            </span>
          </span>
        </div>
        <ol className={`landing-window-body ${windows.body} ${styles.phoneRows}`}>
          {cards.map((card, i) => {
            const key = card.member.key;
            const expanded = open.has(key);
            const id = `member-row-${i + 1}`;
            return (
              <li key={key} className={styles.member} data-role={card.member.tone}>
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
                <div id={id} className={styles.phoneBody} hidden={!expanded}>
                  {expanded && (
                    <>
                      <p className={styles.phoneBodyTitle}>
                        {card.href ? <Link href={card.href}>{card.title}</Link> : card.title}
                        {card.badges}
                      </p>
                      {card.body}
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
