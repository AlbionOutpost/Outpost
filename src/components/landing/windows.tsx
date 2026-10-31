import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { CompRoster } from "@/components/comp-roster";
import Link from "@/components/link";
import { LoadoutBoard } from "@/components/loadout-board";
import type { LibraryBuild, LibraryComposition } from "@/lib/grind-library-types";
import { activityName } from "@/lib/grind-library-types";
import { HeartChip } from "./heart-chip";

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
    <article className="raised has-scene landing-window" data-scene={scene}>
      <div className="landing-window-bar">{bar}</div>
      <div className="landing-window-body">{children}</div>
      <Link href={href} className="landing-window-foot">
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
}: {
  build: LibraryBuild | null;
  spellNames: Record<string, string>;
  comp: LibraryComposition | null;
  members: LibraryBuild[];
  suffix: string;
}) {
  const main = build?.equipment.find((e) => e.slot === "Main hand");
  const byId = new Map(members.map((b) => [b.id, b]));
  const crew = (comp?.members ?? []).flatMap((id) => {
    const b = byId.get(id);
    return b ? [b] : [];
  });
  return (
    <div className="landing-windows" aria-label="A look inside Outpost">
      <Window
        scene="build"
        emblem="strip-builds"
        title="Build planner"
        line="Create and analyze builds with full gear, skills and substitutions."
        href={`/builds/library${suffix}`}
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
                {build.upvotes ? (
                  <HeartChip
                    count={build.upvotes}
                    build={{
                      id: build.id,
                      slug: build.slug.length <= 200 ? build.slug : build.id,
                      title: build.title.slice(0, 200),
                      author: build.author.slice(0, 100),
                      weaponName: build.weaponName.slice(0, 100),
                      category: build.category,
                      itemId: main?.itemId || "",
                      updatedAt: build.updatedAt,
                    }}
                  />
                ) : null}
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
        title="Content manager"
        line="Run your guild’s content, comps and loot in one place. A Supporter feature."
        href={`/groups${suffix}`}
        bar={
          <>
            <span className="landing-window-title">Teams</span>
            <span className="landing-chips">
              <span className="landing-chip">Supporter</span>
            </span>
          </>
        }
      >
        <ol className="landing-features" aria-label="What a Team workspace does">
          {teamFeatures.map(([icon, name, line]) => (
            <li key={icon}>
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
              <img src={`/albion/icons/${icon}.webp`} alt="" width={40} height={40} />
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
        line="Plan comps, share loadouts and coordinate your content."
        href={
          comp
            ? `/compositions/library/${encodeURIComponent(comp.slug)}${suffix}`
            : `/compositions/library${suffix}`
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
                {comp.upvotes ? <HeartChip count={comp.upvotes} /> : null}
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
