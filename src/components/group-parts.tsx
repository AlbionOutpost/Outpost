import type { ReactNode } from "react";
import { regions } from "@/lib/albion/region-config";
import { crestItemName, resolveCrestColor } from "@/lib/groups/crest";
import { ItemIcon } from "./item-icon";
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

const crestPixels = { large: 76, medium: 54, small: 34 };

/**
 * The team's crest: its chosen item render on its palette field, or its initials on a field
 * picked from its name. Used for the masthead emblem, directory cards and invitations.
 */
export function TeamMark({
  name,
  crestItem,
  crestColor,
  size = "large",
}: {
  name: string;
  crestItem?: string | null;
  crestColor?: string | null;
  size?: "large" | "medium" | "small";
}) {
  const item = crestItemName(crestItem) ? crestItem : null;
  return (
    <span
      className={styles.mark}
      data-size={size}
      style={
        {
          "--shield": `url("/albion/crests/crest-${resolveCrestColor(name, crestColor)}.webp")`,
        } as React.CSSProperties
      }
      data-team-crest={item ?? "monogram"}
      aria-hidden="true"
    >
      {item ? <ItemIcon id={item} size={crestPixels[size]} /> : teamInitials(name)}
    </span>
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
