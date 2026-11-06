import "@/app/landing-window.css";
import "@/app/build-window.css";
import windows from "./landing/windows.module.css";
import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
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
 * only a summary of the build is stored.
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
  author,
  updatedAt,
  pieces,
  spellNames,
  heart,
  owner,
  children,
}: {
  className?: string;
  titleId: string;
  href: string;
  title: string;
  /** Activity id or label, for the window's painting. */
  category: string;
  activity: string;
  weaponName: string;
  weaponItemId?: string;
  author: string | null;
  updatedAt: string | Date;
  pieces?: BoardPiece[];
  spellNames?: Record<string, string>;
  /** The ♥ count pill: device or account favourite. */
  heart: ReactNode;
  /** The owner's menu, beside the way in. */
  owner?: ReactNode;
  children?: ReactNode;
}) {
  const date = discoveryDate(updatedAt);
  const art = activityBackgroundFor(category);
  return (
    // The landing's window module, so a build card is sized exactly like the landing's window
    <div className={`${windows.windows} build-window-slot`}>
      <article
        className={`raised has-scene landing-window ${windows.window} build-window ${className}`}
        data-scene="build"
        data-activity={category}
        data-activity-background={art?.src}
        style={art ? ({ "--scene": `url("${art.src}")` } as CSSProperties) : undefined}
      >
        <div className={`landing-window-bar ${windows.bar}`}>
          <Link href={href} className="landing-window-title" aria-labelledby={titleId}>
            <h2 id={titleId}>{title}</h2>
          </Link>
          <span className="landing-chips">
            <span className="landing-chip">{activity}</span>
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
                label={`${title} loadout`}
              />
            ) : (
              <p className="landing-window-empty">No equipment recorded for this build.</p>
            ))}
        </div>
        <div className={`landing-window-foot ${windows.foot}`}>
          <span className="build-window-weapon" aria-hidden="true">
            {weaponItemId ? <ItemIcon id={weaponItemId} size={48} /> : null}
          </span>
          <span>
            <strong>{weaponName || "Equipment plan"}</strong>
            <small>
              By {author || "Adventurer"}
              {date && (
                <>
                  {" · "}
                  <time dateTime={new Date(updatedAt).toISOString()}>{date}</time>
                </>
              )}
            </small>
          </span>
          <span className="build-window-way">
            {owner}
            <Link href={href} tabIndex={-1} aria-hidden="true" className="build-window-open">
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </span>
        </div>
      </article>
    </div>
  );
}
