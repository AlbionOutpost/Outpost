"use client";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/link";
import type { GroupDashboardData } from "@/lib/groups/dashboard";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { EquipmentStrip } from "./equipment-strip";
import { ItemIcon } from "./item-icon";
import { LoadoutBoard } from "./loadout-board";
import { RosterRows } from "./comp-roster";
import { CompGrid, CompWindow } from "./comp-window";
import { SectionHeading } from "./section-heading";
import windows from "./landing/windows.module.css";
import { EmptyWell } from "./empty-well";
import { WellSelect } from "./well-select";
import type { TeamContext } from "./group-dashboard";
import { Field, plural } from "./group-parts";
import styles from "./teams.module.css";

type CompPreview = GroupDashboardData["compositionPreviews"][number];
type SharedBuild = GroupDashboardData["builds"][number];

/** A team comp as a well row: the first five main hands, its title and size, the way in. */
export function CompRow({ comp }: { comp: CompPreview }) {
  return (
    <Link className={`well ${styles.wellRow}`} data-team-comp="" href={`/compositions/${comp.id}`}>
      <span className={styles.rowCopy}>
        <strong className={styles.wrapTitle}>{comp.title}</strong>
        <small>
          {comp.playerCount === null ? "Roster unavailable" : plural(comp.playerCount, "player")}
        </small>
        {comp.weapons.length > 0 && (
          <span className={styles.weapons} aria-label="Primary weapons">
            {comp.weapons.map((w, i) => (
              <span key={i} title={`${w.role}: ${equipmentName(w.itemId)}`}>
                <ItemIcon id={w.itemId} quality={w.quality} size={32} />
              </span>
            ))}
          </span>
        )}
      </span>
      <ArrowUpRight className={styles.rowArrow} size={18} aria-hidden="true" />
    </Link>
  );
}

/** A shared build snapshot as a well row: its pieces, title and main hand. */
export function BuildRow({
  build,
  onOpen,
  heading = "strong",
  children,
}: {
  build: SharedBuild;
  onOpen?: () => void;
  heading?: "strong" | "h3";
  children?: React.ReactNode;
}) {
  const main = build.equipment.find((e) => e.slot === "Main hand");
  const Title = heading;
  const body = (
    <>
      <span className={styles.rowCopy}>
        <Title className={styles.wrapTitle}>{build.title}</Title>
        <small>{main ? equipmentName(main.itemId) : "No main hand recorded"}</small>
        <span className={styles.weapons}>
          <EquipmentStrip
            equipment={build.equipment}
            size={32}
            slots={["Main hand", "Helmet", "Chest", "Boots"]}
          />
        </span>
      </span>
    </>
  );
  return onOpen ? (
    <button type="button" className={`well ${styles.wellRow}`} data-team-build="" onClick={onOpen}>
      {body}
      <ArrowUpRight className={styles.rowArrow} size={18} aria-hidden="true" />
    </button>
  ) : (
    <div className={`well ${styles.wellRow}`} data-team-build="">
      {body}
      {children && <span className={styles.rowTools}>{children}</span>}
    </div>
  );
}

/** A team comp as the landing's comp window: its first members by weapon, the size, the way in. */
function TeamCompWindow({ comp }: { comp: CompPreview }) {
  return (
    <CompWindow
      title={comp.title}
      href={`/compositions/${comp.id}`}
      total={comp.playerCount ?? 0}
      noun="player"
      byline={comp.playerCount === null ? "Roster unavailable" : "Shared with the team"}
    >
      {comp.weapons.length ? (
        <RosterRows
          label={`${comp.title} members by weapon`}
          members={comp.weapons.map((w, i) => ({
            key: `${w.itemId}-${i}`,
            weapon: { itemId: w.itemId, quality: w.quality },
            name: equipmentName(w.itemId),
            role: w.role,
            tone: w.role,
            armor: [],
          }))}
        />
      ) : (
        <p className="landing-window-empty">Open the comp to see its roster.</p>
      )}
    </CompWindow>
  );
}

export type LoadoutView = "comps" | "builds";
/** Loadouts' two views, each with its own link: the old Comps and Builds tab hashes. */
export const loadoutViews: { key: LoadoutView; label: string; hash: string }[] = [
  { key: "comps", label: "Comps", hash: "#team-comps" },
  { key: "builds", label: "Builds", hash: "#team-builds" },
];
export function loadoutViewOf(hash: string): LoadoutView | null {
  if (hash === "#team-loadouts") return "comps";
  return loadoutViews.find((v) => v.hash === hash)?.key ?? null;
}

/**
 * The team's shared comps and builds in one tab, one view at a time under a segmented control
 * that carries each count, like the Treasury's.
 */
export function GroupLoadouts({
  ctx,
  view,
  onView,
}: {
  ctx: TeamContext;
  view: LoadoutView;
  onView: (view: LoadoutView) => void;
}) {
  const count = { comps: ctx.data.compositions.length, builds: ctx.data.builds.length };
  return (
    <div className={styles.loadouts}>
      <nav className={`segmented ${styles.subNav}`} aria-label="Loadouts">
        {loadoutViews.map((v) => (
          <a
            key={v.key}
            href={v.hash}
            aria-current={view === v.key ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              onView(v.key);
            }}
          >
            {v.label} <span className={styles.subCount}>{count[v.key].toLocaleString("en")}</span>
          </a>
        ))}
      </nav>
      {view === "comps" ? <GroupComps ctx={ctx} /> : <GroupBuilds ctx={ctx} />}
    </div>
  );
}

function GroupComps({ ctx }: { ctx: TeamContext }) {
  const { data } = ctx;
  const editor = ctx.can("manageComps");
  const previews = new Map(data.compositionPreviews.map((c) => [c.id, c]));
  return (
    <section className={styles.section} id="guild-compositions" aria-labelledby="team-comps-all">
      <SectionHeading
        id="team-comps-all"
        title={
          <>
            Shared <em>comps</em>
          </>
        }
        line={
          data.compositions.length
            ? `${plural(data.compositions.length, "comp")}, visible to members only.`
            : "Comps saved to this team are visible to members only."
        }
        link={
          editor && data.compositions.length
            ? { href: "/compositions/new", label: "Create comp" }
            : undefined
        }
      />
      {data.compositions.length ? (
        <CompGrid>
          {data.compositions.map((c) => (
            <li key={c.id} data-team-comp="">
              <TeamCompWindow
                comp={
                  previews.get(c.id) ?? { id: c.id, title: c.title, playerCount: null, weapons: [] }
                }
              />
            </li>
          ))}
        </CompGrid>
      ) : (
        <EmptyWell
          surface
          emblem="team-comps"
          title="No shared comps yet"
          line="Create a comp and set its visibility to this team; it shows up here for every member."
          action={
            <Link className="button secondary" href="/compositions/new">
              Create a comp
            </Link>
          }
        />
      )}
    </section>
  );
}

/** A shared build snapshot as the landing's build window: the loadout board and its main hand. */
function TeamBuildWindow({ build, children }: { build: SharedBuild; children?: ReactNode }) {
  const main = build.equipment.find((e) => e.slot === "Main hand");
  return (
    <article
      className={`raised landing-window ${windows.window} ${styles.buildWindow}`}
      data-scene="build"
      data-team-build=""
    >
      <div className={`landing-window-bar ${windows.bar}`}>
        <h3 className={`landing-window-title ${styles.windowTitle}`} title={build.title}>
          {build.title}
        </h3>
        <span className="landing-chips">
          <span className="landing-chip is-muted">Snapshot</span>
        </span>
      </div>
      <div className={`landing-window-body ${windows.body}`}>
        {build.equipment.length ? (
          <LoadoutBoard
            pieces={build.equipment}
            size="card"
            abilities={false}
            label={`${build.title} loadout`}
          />
        ) : (
          <p className="landing-window-empty">No equipment recorded for this build.</p>
        )}
      </div>
      <div className={`landing-window-foot ${windows.foot} ${styles.buildFoot}`}>
        <span aria-hidden="true">
          {main ? <ItemIcon id={main.itemId} quality={main.quality} size={40} /> : null}
        </span>
        <span>
          <strong>{main ? equipmentName(main.itemId) : "No main hand recorded"}</strong>
          <small>Copied when it was shared</small>
        </span>
        {children}
      </div>
    </article>
  );
}

function GroupBuilds({ ctx }: { ctx: TeamContext }) {
  const { data, busy, run } = ctx;
  const editor = ctx.can("manageBuilds");
  return (
    <section className={styles.section} aria-labelledby="team-builds-all">
      <SectionHeading
        id="team-builds-all"
        title={
          <>
            Shared <em>builds</em>
          </>
        }
        line="A copy of each build as it was when shared; later edits to the original stay out."
      />
      {editor && (
        <form
          className={`raised ${styles.shareBar}`}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run({ action: "share-build", buildId: f.get("buildId") });
          }}
        >
          <Field label="Build to share">
            <WellSelect name="buildId" required aria-label="Build to share">
              <option value="">Choose one of your builds or a public one</option>
              {data.availableBuilds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </WellSelect>
          </Field>
          <button className="button primary" disabled={busy}>
            Share build snapshot
          </button>
        </form>
      )}
      {data.builds.length ? (
        <ul className={`${windows.windows} ${styles.buildGrid}`}>
          {data.builds.map((b) => (
            <li key={b.id}>
              <TeamBuildWindow build={b}>
                {editor && (
                  <button
                    type="button"
                    className={`pill-link is-small ${styles.lossButton}`}
                    disabled={busy}
                    aria-label={`Remove build snapshot ${b.title}`}
                    onClick={() => run({ action: "remove-build", id: b.id })}
                  >
                    Remove
                  </button>
                )}
              </TeamBuildWindow>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyWell
          surface
          emblem="strip-builds"
          title="No shared builds yet"
          line={
            editor
              ? "Pick a build above to give every member the same set."
              : "Members with Share builds can share builds here for the whole team."
          }
          action={
            <Link className="button secondary" href="/builds?source=library">
              Browse the build library
            </Link>
          }
        />
      )}
    </section>
  );
}
