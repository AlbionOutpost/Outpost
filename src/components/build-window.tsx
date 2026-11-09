import "@/app/landing-window.css";
import "@/app/build-window.css";
import windows from "./landing/windows.module.css";
import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { SupporterBadge } from "./supporter-badge";
import Link from "@/components/build-region-link";
import { activityBackgroundFor } from "@/lib/activity-backgrounds";
import { discoveryDate } from "@/lib/build-discovery";
import { ItemIcon } from "./item-icon";
import { LoadoutBoard, type BoardPiece } from "./loadout-board";

/**
 * A build as the landing's build window: the title, activity chip and ♥ count on the bar
 * over an ember rule, the loadout on the game's board at window width with the chosen
 * abilities on the pieces, and one foot row (the weapon, who made it, when, the way in).
 * Library, player and device-saved builds all use it; `children` replaces the board when
 * only a summary of the build is stored. Comp pages reuse it for each member: `chips` puts the
 * member's role on the bar, `line` says who plays it, and a member with no build page has no `href`.
 */
export function BuildWindow({
  className = "",
  titleId,
  href,
  title,
  category,
  activity,
  weaponName,
  weaponItemId,
  weaponQuality,
  author,
  authorSupporter = false,
  updatedAt,
  pieces,
  spellNames,
  abilities = true,
  heart,
  chips,
  line,
  number,
  heading: Heading = "h2",
  owner,
  children,
}: {
  className?: string;
  titleId: string;
  /** The build's page; without one the title is plain text and the foot has no way in. */
  href?: string;
  title: string;
  /** Activity id or label, for the window's painting. */
  category: string;
  activity?: string;
  weaponName: string;
  weaponItemId?: string;
  weaponQuality?: number;
  author?: string | null;
  /** Server-derived Supporter badge for the author. */
  authorSupporter?: boolean;
  updatedAt?: string | Date;
  pieces?: BoardPiece[];
  spellNames?: Record<string, string>;
  /** False when the stored abilities are names rather than spell ids (a player comp's members). */
  abilities?: boolean;
  /** The ♥ count pill: device or account favourite. */
  heart?: ReactNode;
  /** Chips that replace the activity chip on the bar (a comp member's role). */
  chips?: ReactNode;
  /** The foot's second line, in place of the author and date. */
  line?: ReactNode;
  /** A comp member's place in the party, before the title. */
  number?: number;
  heading?: "h2" | "h3";
  /** The owner's menu, beside the way in. */
  owner?: ReactNode;
  children?: ReactNode;
}) {
  const date = updatedAt ? discoveryDate(updatedAt) : null;
  const art = activityBackgroundFor(category);
  const name = (
    <>
      {number != null && <span className="build-window-n">{number}</span>}
      <Heading id={titleId}>{title}</Heading>
    </>
  );
  return (
    // The landing's window module, so a build card is sized exactly like the landing's window
    <div className={`${windows.windows} build-window-slot`}>
      <article
        className={`raised${href ? " is-link" : ""} landing-window ${windows.window} build-window ${className}`}
        data-scene="build"
        data-activity={category}
        data-activity-background={art?.src}
        style={art ? ({ "--scene": `url("${art.src}")` } as CSSProperties) : undefined}
      >
        <div className={`landing-window-bar ${windows.bar}`}>
          {href ? (
            // Named by its content, so a comp member's number is part of the name it shows
            <Link href={href} className="landing-window-title">
              {name}
            </Link>
          ) : (
            <span className="landing-window-title">{name}</span>
          )}
          <span className="landing-chips">
            {chips ?? <span className="landing-chip">{activity}</span>}
            {heart}
          </span>
        </div>
        <div className={`landing-window-body ${windows.body}`}>
          {children ??
            (pieces?.length ? (
              <LoadoutBoard
                pieces={pieces}
                spellNames={spellNames}
                size="card"
                choices
                abilities={abilities}
                label={`${title} loadout`}
              />
            ) : (
              <p className="landing-window-empty">No equipment recorded for this build.</p>
            ))}
        </div>
        <div className={`landing-window-foot ${windows.foot}`}>
          <span className="build-window-weapon" aria-hidden="true">
            {weaponItemId ? <ItemIcon id={weaponItemId} quality={weaponQuality} size={48} /> : null}
          </span>
          <span>
            <strong>{weaponName || "Equipment plan"}</strong>
            <small>
              {line ?? (
                <>
                  By {author || "Adventurer"}
                  {authorSupporter && (
                    <>
                      {" "}
                      <SupporterBadge compact />
                    </>
                  )}
                  {date && updatedAt && (
                    <>
                      {" · "}
                      <time dateTime={new Date(updatedAt).toISOString()}>{date}</time>
                    </>
                  )}
                </>
              )}
            </small>
          </span>
          {(owner || href) && (
            <span className="build-window-way">
              {owner}
              {href && (
                <Link href={href} tabIndex={-1} aria-hidden="true" className="build-window-open">
                  <ArrowUpRight size={20} aria-hidden="true" />
                </Link>
              )}
            </span>
          )}
        </div>
      </article>
    </div>
  );
}
