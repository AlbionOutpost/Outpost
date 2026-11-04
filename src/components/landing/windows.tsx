import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { CompRoster } from "@/components/comp-roster";
import Link from "@/components/link";
import { LoadoutBoard } from "@/components/loadout-board";
import type { LibraryBuild, LibraryComposition } from "@/lib/grind-library-types";
import { activityName } from "@/lib/grind-library-types";
import { AccountLikeChip } from "./account-like-chip";
import styles from "./windows.module.css";

/** One teaser window: a glimpse of the product above, the product's name and line below. */
function Window({
  scene,
  emblem,
  title,
  line,
  href,
  bar,
  children,
}: {
  scene: "build" | "composition" | "market";
  emblem: string;
  title: string;
  line: string;
  href: string;
  bar: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className={`raised has-scene landing-window ${styles.window}`} data-scene={scene}>
      <div className={`landing-window-bar ${styles.bar}`}>{bar}</div>
      <div className={`landing-window-body ${styles.body}`}>{children}</div>
      <Link href={href} className={`landing-window-foot ${styles.foot}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
        <img src={`/albion/icons/${emblem}.webp`} alt="" width={48} height={48} />
        <span>
          <strong>{title}</strong>
          <small>{line}</small>
        </span>
        <ArrowUpRight size={20} aria-hidden="true" />
      </Link>
    </article>
  );
}

const teamFeatures = [
  ["team-announce", "Content announcements", "Time, mass-up, comp · members RSVP"],
  ["team-comps", "Shared comps", "Per-slot loadouts and swaps for every member"],
  ["team-loot", "Loot splits", "Haul, repair and tax, split fairly, kept"],
  ["team-calendar", "Calendar", "Every event exports to ICS"],
  ["team-roles", "Roles & invites", "Owner, officers, members · private by default"],
] as const;

/**
 * A public build and comp show the two planning tools with recorded equipment and
 * abilities. Team capabilities follow as a compact companion, without private guild data.
 */
export function LandingWindows({
  build,
  spellNames,
  comp,
  members,
  suffix,
}: {
  build: LibraryBuild | null;
  spellNames: Record<string, string>;
  comp: LibraryComposition | null;
  members: LibraryBuild[];
  suffix: string;
}) {
  const byId = new Map(members.map((b) => [b.id, b]));
  const crew = (comp?.members ?? []).flatMap((id) => {
    const b = byId.get(id);
    return b ? [b] : [];
  });
  return (
    <div className={`landing-windows ${styles.windows}`} aria-label="A look inside Outpost">
      <Window
        scene="build"
        emblem="strip-builds"
        title="Build creator"
        line="Put together a full set with spells and swaps, then share it."
        href={`/builds/new${suffix}`}
        bar={
          build ? (
            <>
              <Link
                href={`/builds/library/${encodeURIComponent(build.slug)}${suffix}`}
                className="landing-window-title"
              >
                {build.title}
              </Link>
              <span className="landing-chips">
                <span className="landing-chip">{activityName(build.category)}</span>
                <AccountLikeChip
                  key={`build:${build.slug}`}
                  kind="build"
                  slug={build.slug}
                  title={build.title}
                  archivedCount={build.upvotes}
                />
              </span>
            </>
          ) : (
            <span className="landing-window-title">Build creator</span>
          )
        }
      >
        {build ? (
          <LoadoutBoard
            pieces={build.equipment}
            spellNames={spellNames}
            size="card"
            choices
            label={build.title}
          />
        ) : (
          <p className="landing-window-empty">No public build to show.</p>
        )}
      </Window>

      <Window
        scene="composition"
        emblem="strip-comps"
        title="Comp planner"
        line="Build the comp, hand out the sets and get everyone on the same page."
        href={`/compositions/new${suffix}`}
        bar={
          comp ? (
            <>
              <Link
                href={`/compositions/library/${encodeURIComponent(comp.slug)}${suffix}`}
                className="landing-window-title"
              >
                {comp.title}
              </Link>
              <span className="landing-chips">
                <span className="landing-chip">{activityName(comp.category)}</span>
                <AccountLikeChip
                  key={`composition:${comp.slug}`}
                  kind="composition"
                  slug={comp.slug}
                  title={comp.title}
                  archivedCount={comp.upvotes}
                />
              </span>
            </>
          ) : (
            <span className="landing-window-title">Comp planner</span>
          )
        }
      >
        {comp && crew.length ? (
          <CompRoster members={crew} suffix={suffix} />
        ) : (
          <p className="landing-window-empty">No public group build to show.</p>
        )}
      </Window>
      <aside
        className={`raised has-scene ${styles.team}`}
        data-scene="market"
        aria-label="Team Management"
      >
        <div className={styles.teamIntro}>
          {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
          <img src="/albion/icons/strip-content.webp" alt="" width={40} height={40} />
          <div>
            <div className={styles.teamHeading}>
              <h3>Team Management</h3>
              <span className="landing-chip">Supporter</span>
            </div>
            <p>Run a Team with Supporter. Members join free.</p>
          </div>
        </div>
        <ul className={styles.teamFeatures} aria-label="What a Team workspace does">
          {teamFeatures.map(([icon, name, line]) => (
            <li key={icon} title={line}>
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
              <img src={`/albion/icons/${icon}.webp`} alt="" width={24} height={24} />
              <span>{name}</span>
            </li>
          ))}
        </ul>
        <Link href={`/groups${suffix}`} className={`pill-link ${styles.teamAction}`}>
          Explore Teams <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}
