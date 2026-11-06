import type { ReactNode } from "react";
import { regions } from "@/lib/albion/region-config";
import { NextStepCards } from "./next-step-cards";
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

/** The team's monogram, as its masthead emblem and on its window in the directory. */
export function TeamMark({ name, size = "large" }: { name: string; size?: "large" | "small" }) {
  return (
    <span className={styles.mark} data-size={size} aria-hidden="true">
      {teamInitials(name)}
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

/** The chips under a team's name: region, visibility and size. */
export function TeamChips({
  region,
  visibility,
  members,
  children,
}: {
  region: string;
  visibility: string;
  members?: number;
  children?: ReactNode;
}) {
  return (
    <div className={`landing-chips ${styles.chips}`}>
      <span className="landing-chip">{regionLabel(region)}</span>
      <span className="landing-chip is-muted">{visibilityLabel(visibility)}</span>
      {members !== undefined && (
        <span className="landing-chip is-muted">{plural(members, "member")}</span>
      )}
      {children}
    </div>
  );
}

export { Field } from "./field";

/** The closing row of a team's pages: where a team goes to get its sets ready. */
export function TeamNextSteps() {
  return (
    <NextStepCards
      id="team-next"
      title={
        <>
          Gear the <em>team</em> up
        </>
      }
      line="Plan who plays what, cost the sets and buy them in the right city."
      cards={[
        {
          href: "/compositions/new",
          emblem: "strip-comps",
          title: "Plan a comp",
          line: "Roles and loadouts for every slot.",
          scene: "composition",
        },
        {
          href: "/tools/crafting",
          emblem: "tool-craft",
          title: "Craft the sets",
          line: "See what each piece costs to make.",
          scene: "build",
        },
        {
          href: "/tools/market",
          emblem: "tool-market",
          title: "Check prices",
          line: "Every city, buy and sell orders.",
          scene: "market",
        },
      ]}
    />
  );
}
