"use client";
import { ArrowUpRight, Plus } from "lucide-react";
import Link from "@/components/link";
import type { GroupDashboardData } from "@/lib/groups/dashboard";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { EquipmentStrip } from "./equipment-strip";
import { ItemIcon } from "./item-icon";
import { PanelHead } from "./panel-head";
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
      <span className={styles.weapons} aria-label="Primary weapons">
        {comp.weapons.map((w, i) => (
          <span key={i} title={`${w.role}: ${equipmentName(w.itemId)}`}>
            <ItemIcon id={w.itemId} quality={w.quality} size={34} />
          </span>
        ))}
      </span>
      <span className={styles.rowCopy}>
        <strong>{comp.title}</strong>
        <small>
          {comp.playerCount === null ? "Roster unavailable" : plural(comp.playerCount, "player")}
        </small>
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
      <EquipmentStrip
        equipment={build.equipment}
        size={34}
        slots={["Main hand", "Helmet", "Chest", "Boots"]}
      />
      <span className={styles.rowCopy}>
        <Title>{build.title}</Title>
        <small>{main ? equipmentName(main.itemId) : "No main hand recorded"}</small>
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

export function GroupComps({ ctx }: { ctx: TeamContext }) {
  const { data, editor } = ctx;
  const previews = new Map(data.compositionPreviews.map((c) => [c.id, c]));
  return (
    <section
      className={`panel ${styles.panel}`}
      id="guild-compositions"
      aria-labelledby="team-comps-all"
    >
      <PanelHead
        id="team-comps-all"
        emblem="team-comps"
        title="Shared comps"
        line={
          data.compositions.length
            ? `${plural(data.compositions.length, "comp")} · visible to members only`
            : "Comps saved to this team are visible to members only."
        }
        actions={
          editor ? (
            <Link className="button secondary" href="/compositions/new">
              <Plus size={16} aria-hidden="true" /> Create comp
            </Link>
          ) : undefined
        }
      />
      {data.compositions.length ? (
        <ul className={styles.list}>
          {data.compositions.map((c) => (
            <li key={c.id}>
              <CompRow
                comp={
                  previews.get(c.id) ?? { id: c.id, title: c.title, playerCount: null, weapons: [] }
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyWell
          title="No shared comps yet"
          line="Create a comp and set its visibility to this team; it shows up here for every member."
        />
      )}
    </section>
  );
}

export function GroupBuilds({ ctx }: { ctx: TeamContext }) {
  const { data, editor, busy, run } = ctx;
  return (
    <section className={`panel ${styles.panel}`} aria-labelledby="team-builds-all">
      <PanelHead
        id="team-builds-all"
        emblem="strip-builds"
        title="Shared builds"
        line="A copy of the build at the moment it was shared; later edits to the original stay out."
      />
      {editor && (
        <form
          className={styles.inlineForm}
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
        <ul className={styles.list}>
          {data.builds.map((b) => (
            <li key={b.id}>
              <BuildRow build={b} heading="h3">
                {editor && (
                  <button
                    type="button"
                    className={`button secondary ${styles.lossButton}`}
                    disabled={busy}
                    aria-label={`Remove build snapshot ${b.title}`}
                    onClick={() => run({ action: "remove-build", id: b.id })}
                  >
                    Remove
                  </button>
                )}
              </BuildRow>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyWell
          title="No shared builds yet"
          line={
            editor
              ? "Pick a build above to give every member the same set."
              : "Officers can share builds here for the whole team."
          }
        />
      )}
    </section>
  );
}
