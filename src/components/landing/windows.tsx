import "@/app/landing-window.css";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { CompRoster } from "@/components/comp-roster";
import Link from "@/components/link";
import { LoadoutBoard } from "@/components/loadout-board";
import type { LibraryBuild, LibraryComposition } from "@/lib/grind-library-types";
import { activityName } from "@/lib/grind-library-types";
import { variantSrcSet } from "@/lib/image-variants";
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
        <img
          src={`/albion/icons/${emblem}.webp`}
          srcSet={variantSrcSet(`/albion/icons/${emblem}.webp`)}
          sizes="48px"
          alt=""
          width={48}
          height={48}
        />
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
 * Three windows riding the hero's edge: a public build on the game's board with the chosen
 * abilities on the items, what a Team workspace does, and a public comp read as a roster by
 * weapon type. Everything shown is recorded in the library; nothing is staged.
 */
export function LandingWindows({
  build,
  spellNames,
  comp,
  members,
  suffix,
  teamsPaid = false,
}: {
  build: LibraryBuild | null;
  spellNames: Record<string, string>;
  comp: LibraryComposition | null;
  members: LibraryBuild[];
  suffix: string;
  /** Teams need the Supporter plan only while billing is configured. */
  teamsPaid?: boolean;
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
        title="Build planner"
        line="Put together a full set with spells and swaps, then share it."
        href={`/builds${suffix}&source=library`}
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
            <span className="landing-window-title">Build planner</span>
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
        scene="market"
        emblem="strip-content"
        title="Team Management"
        line={`Mass-ups, comps and loot splits for your guild.${teamsPaid ? " Supporter feature." : ""}`}
        href={`/groups${suffix}`}
        bar={
          <>
            <span className="landing-window-title">Team Management</span>
            <span className="landing-chips">
              <span className="landing-chip">{teamsPaid ? "Supporter" : "Free"}</span>
            </span>
          </>
        }
      >
        <ol
          className={`landing-features ${styles.features}`}
          aria-label="What a Team workspace does"
        >
          {teamFeatures.map(([icon, name, line]) => (
            <li key={icon}>
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
              <img
                src={`/albion/icons/${icon}.webp`}
                srcSet={variantSrcSet(`/albion/icons/${icon}.webp`)}
                sizes="40px"
                alt=""
                width={40}
                height={40}
              />
              <span>
                <strong>{name}</strong>
                <small>{line}</small>
              </span>
            </li>
          ))}
        </ol>
      </Window>

      <Window
        scene="composition"
        emblem="strip-comps"
        title="Comp planner"
        line="Build the comp, hand out the sets and get everyone on the same page."
        href={
          comp
            ? `/compositions/library/${encodeURIComponent(comp.slug)}${suffix}`
            : `/compositions${suffix}&source=library`
        }
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
    </div>
  );
}
