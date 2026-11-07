import type { ReactNode } from "react";
import { regions } from "@/lib/albion/region-config";
import { resolveCrestCharge, resolveCrestColor } from "@/lib/groups/crest";
import styles from "./teams.module.css";

/** A team's two-letter mark: the first letters of its first two words. */
export function teamInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * The team's crest: its painted symbol on its painted shield, or the default crest (the tower on
 * the orange shield) until an owner or admin picks one. Used wherever a team appears.
 */
export function TeamMark({
  crestItem,
  crestColor,
  size = "large",
}: {
  /** Kept for callers; the crest no longer shows the team's name. */
  name?: string;
  crestItem?: string | null;
  crestColor?: string | null;
  size?: "large" | "medium" | "small";
}) {
  const charge = resolveCrestCharge(crestItem);
  return (
    <span
      className={styles.mark}
      data-size={size}
      data-team-crest={charge}
      style={
        {
          "--shield": `url("/albion/crests/crest-${resolveCrestColor(crestColor)}.webp")`,
          "--charge": `url("/albion/charges/${charge}.webp")`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    />
  );
}

export const regionLabel = (region: string) =>
  regions[region as keyof typeof regions]?.label ?? region;
export const visibilityLabel = (visibility: string) =>
  visibility === "PUBLIC" ? "Public" : "Private";
export const roleLabel = (role: string) => role.charAt(0) + role.slice(1).toLowerCase();
export const plural = (n: number, noun: string) =>
  `${n.toLocaleString("en")} ${n === 1 ? noun : `${noun}s`}`;

/** Whether a player can ask to join: public and recruiting, public and closed, or invitation only. */
export function joiningLabel(team: { visibility: string; recruiting: boolean }) {
  return team.visibility !== "PUBLIC"
    ? "Invitation only"
    : team.recruiting
      ? "Recruiting"
      : "Not recruiting";
}

/** The chips under a team's name: region, visibility, size and whether it takes requests. */
export function TeamChips({
  region,
  visibility,
  members,
  recruiting,
  children,
}: {
  region: string;
  visibility: string;
  members?: number;
  recruiting?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`landing-chips ${styles.chips}`}>
      <span className="landing-chip">{regionLabel(region)}</span>
      <span className="landing-chip is-muted">{visibilityLabel(visibility)}</span>
      {members !== undefined && (
        <span className="landing-chip is-muted">{plural(members, "member")}</span>
      )}
      {recruiting !== undefined && visibility === "PUBLIC" && (
        <span className="landing-chip is-muted" data-recruiting={recruiting}>
          {recruiting ? "Recruiting" : "Not recruiting"}
        </span>
      )}
      {children}
    </div>
  );
}

/** The activities a team plays, as quiet chips; nothing when it hasn't said. */
export function TeamActivities({ list }: { list: readonly string[] }) {
  if (!list.length) return null;
  return (
    <ul className={styles.plays} aria-label="What this team plays">
      {list.map((a) => (
        <li key={a} className="landing-chip is-muted">
          {a}
        </li>
      ))}
    </ul>
  );
}

export { Field } from "./field";
