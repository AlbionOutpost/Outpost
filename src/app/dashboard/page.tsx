import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Plus, ShieldCheck } from "lucide-react";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { AvatarFrame } from "@/components/avatar-frame";
import { PanelHead } from "@/components/panel-head";
import { EquipmentStrip } from "@/components/equipment-strip";
import { ItemIcon } from "@/components/item-icon";
import { TeamMark, topRoleName } from "@/components/group-parts";
import { timerCategory, timerStatus, timerLeft } from "@/components/timer-labels";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { listAccountBuilds } from "@/lib/builds/discovery-service";
import { productionPlanSchema } from "@/lib/albion/production-plan";
import styles from "./dashboard.module.css";
import { signInPath } from "@/lib/sign-in-return";
import { displayName } from "@/lib/display-name";
export const metadata = privateMetadata("Dashboard");

const renderedAt = () => Date.now();
const visibility: Record<string, string> = { PRIVATE: "Private", UNLISTED: "Unlisted" };
/** A stored comp's main hands and size, read loosely: a comp that fails validation still lists. */
function rosterOf(slots: unknown) {
  if (!Array.isArray(slots)) return { total: 0, weapons: [] };
  const weapons = slots.slice(0, 5).flatMap((slot) => {
    const equipment = (slot as { equipment?: unknown } | null)?.equipment;
    const main = Array.isArray(equipment)
      ? equipment.find((e) => e && typeof e === "object" && e.slot === "Main hand")
      : null;
    return main && typeof main.itemId === "string"
      ? [{ itemId: main.itemId as string, quality: Number(main.quality) || 1 }]
      : [];
  });
  return { total: slots.length, weapons };
}
const day = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);

/** One working list: a panel head with its "All" link, then rows, or one line saying it's empty. */
function Shelf({
  id,
  title,
  line,
  all,
  empty,
  children,
}: {
  id: string;
  title: ReactNode;
  line: string;
  all?: { href: string; label: string };
  /** Shown in place of the rows: one sentence and the action that fills the list. */
  empty?: { line: string; href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <section className={`panel ${styles.shelf}`} aria-labelledby={id}>
      <PanelHead
        id={id}
        title={title}
        line={empty ? empty.line : line}
        actions={
          empty ? (
            <Link href={empty.href} className="pill-link is-small">
              {empty.label} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          ) : all ? (
            <Link href={all.href} className="pill-link is-small">
              {all.label} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          ) : undefined
        }
      />
      {!empty && <ul className={styles.rows}>{children}</ul>}
    </section>
  );
}

/**
 * The signed-in home: what you were working on, as compact rows. Builds and comps in the main
 * column; running timers, Teams and saved calculator plans beside them. An empty list is one
 * line with its action; a brand-new account sees one first step instead of five empty lists.
 */
export default async function Dashboard() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect(signInPath("/dashboard"));
  const [u, mine] = await Promise.all([
    db.user.findUnique({
      where: { id: s.user.id },
      select: {
        name: true,
        image: true,
        avatarFrame: true,
        role: true,
        compositions: {
          select: { id: true, title: true, updatedAt: true, slots: true },
          take: 4,
          orderBy: { updatedAt: "desc" },
        },
        memberships: {
          include: {
            group: {
              select: { name: true, slug: true, crestItem: true, crestColor: true, ownerId: true },
            },
            roles: {
              select: { role: { select: { id: true, name: true } } },
              orderBy: { role: { position: "desc" } },
            },
          },
          take: 5,
        },
        timers: {
          where: { status: { not: "COMPLETED" } },
          orderBy: { updatedAt: "desc" },
          take: 4,
        },
        savedScenarios: {
          select: { id: true, title: true, kind: true, configuration: true, updatedAt: true },
          take: 4,
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    listAccountBuilds(s.user.id, {
      q: "",
      mine: true,
      content: "",
      codes: [],
      sort: "recent",
      page: 1,
    }),
  ]);
  if (!u) redirect(signInPath("/dashboard"));
  const now = renderedAt();
  const builds = mine.builds.slice(0, 5);
  const timers = u.timers.toSorted(
    (a, b) => Number(b.status === "RUNNING") - Number(a.status === "RUNNING"),
  );
  const fresh =
    !builds.length &&
    !u.compositions.length &&
    !u.memberships.length &&
    !u.timers.length &&
    !u.savedScenarios.length;
  const staff = ["ADMIN", "MODERATOR"].includes(u.role) && (
    <Link className="button secondary" href={u.role === "ADMIN" ? "/admin" : "/admin/reports"}>
      <ShieldCheck size={16} aria-hidden="true" /> {u.role === "ADMIN" ? "Admin" : "Moderation"}
    </Link>
  );
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        icon="account"
        emblem={<AvatarFrame frame={u.avatarFrame} size={96} image={u.image} name={u.name} />}
        scene="guides"
        title={`Welcome, ${displayName(u.name)}.`}
        accent="Welcome"
        description={
          fresh
            ? "Builds, comps, Teams, timers and saved plans you make collect here."
            : "Pick up where you left off."
        }
        actions={
          <span className={styles.headActions}>
            {staff}
            {!fresh && (
              <>
                <Link className="button secondary" href="/compositions/new">
                  <Plus size={16} aria-hidden="true" /> New comp
                </Link>
                <Link className="button primary" href="/builds/new">
                  <Plus size={16} aria-hidden="true" /> New build
                </Link>
              </>
            )}
          </span>
        }
      />
      {fresh ? (
        <section className={`raised has-scene ${styles.first}`} data-scene="build">
          {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
          <img src="/albion/icons/strip-builds.webp" alt="" width={96} height={96} />
          <div className={styles.firstCopy}>
            <h2>
              Start with your first <em>build</em>
            </h2>
            <p>
              Pick a weapon, armor and abilities on the board, then save it to your account. Copy
              one from the library if you&apos;d rather change someone else&apos;s.
            </p>
            <div className={styles.firstActions}>
              <Link className="button primary" href="/builds/new">
                Create a build
              </Link>
              <Link className="pill-link" href="/builds">
                Browse builds <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className={styles.grid}>
          <div className={styles.column}>
            <Shelf
              id="dash-builds"
              title={
                <>
                  Your <em>builds</em>
                </>
              }
              line={`${mine.total.toLocaleString("en-GB")} saved, last edited first.`}
              all={
                mine.total > builds.length ? { href: "/builds?mine=1", label: "All" } : undefined
              }
              empty={
                builds.length
                  ? undefined
                  : { line: "No builds yet.", href: "/builds/new", label: "Create a build" }
              }
            >
              {builds.map((b) => {
                return (
                  <li key={b.id} data-dashboard-work="">
                    <Link href={`/builds/${b.id}`} className={`well ${styles.row}`}>
                      <EquipmentStrip
                        equipment={b.equipment}
                        size={32}
                        slots={["Main hand", "Off hand", "Helmet", "Chest", "Boots", "Cape"]}
                      />
                      <span className={styles.rowCopy}>
                        <strong>{b.title}</strong>
                        <small>
                          {[
                            b.contentType || "Other",
                            visibility[b.visibility],
                            `Edited ${day(b.updatedAt)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </Shelf>
            <Shelf
              id="dash-comps"
              title={
                <>
                  Your <em>comps</em>
                </>
              }
              line="Party plans you made, last edited first."
              all={
                u.compositions.length ? { href: "/compositions?mine=1", label: "All" } : undefined
              }
              empty={
                u.compositions.length
                  ? undefined
                  : {
                      line: "No comps yet. Give each slot a role and a loadout.",
                      href: "/compositions/new",
                      label: "Create a comp",
                    }
              }
            >
              {u.compositions.map((c) => {
                const roster = rosterOf(c.slots);
                return (
                  <li key={c.id} data-dashboard-work="">
                    <Link href={`/compositions/${c.id}`} className={`well ${styles.row}`}>
                      <span className={styles.party} aria-hidden="true">
                        {roster.weapons.length ? (
                          roster.weapons.map((w, i) => (
                            <ItemIcon key={i} id={w.itemId} quality={w.quality} size={32} />
                          ))
                        ) : (
                          <span className={styles.partyEmpty}>No weapons yet</span>
                        )}
                      </span>
                      <span className={styles.rowCopy}>
                        <strong>{c.title}</strong>
                        <small>
                          {roster.total} {roster.total === 1 ? "member" : "members"} · Edited{" "}
                          {day(c.updatedAt)}
                        </small>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </Shelf>
          </div>
          <div className={styles.column}>
            <Shelf
              id="dash-timers"
              title="Timers"
              line="Running first."
              all={u.timers.length ? { href: "/timers", label: "Manage" } : undefined}
              empty={
                u.timers.length
                  ? undefined
                  : { line: "No timers running.", href: "/timers", label: "Add a timer" }
              }
            >
              {timers.map((timer) => (
                <li key={timer.id} className={`well ${styles.row}`} data-dashboard-timer="">
                  <span className={styles.rowCopy}>
                    <strong>{timer.title}</strong>
                    <small>
                      {timerCategory(timer.category)} · {timerLeft(timer, now)}
                    </small>
                  </span>
                  <span
                    className={
                      timer.status === "RUNNING" ? "landing-chip" : "landing-chip is-muted"
                    }
                  >
                    {timerStatus(timer.status)}
                  </span>
                </li>
              ))}
            </Shelf>
            <Shelf
              id="dash-teams"
              title="Your Teams"
              line="Your role in each."
              all={u.memberships.length ? { href: "/groups?mine=1", label: "All" } : undefined}
              empty={
                u.memberships.length
                  ? undefined
                  : { line: "Not in a Team yet.", href: "/groups", label: "Find a Team" }
              }
            >
              {u.memberships.map((member) => (
                <li key={member.groupId}>
                  <Link className={`well ${styles.row}`} href={`/groups/${member.group.slug}`}>
                    <TeamMark
                      name={member.group.name}
                      crestItem={member.group.crestItem}
                      crestColor={member.group.crestColor}
                      size="small"
                    />
                    <span className={styles.rowCopy}>
                      <strong>{member.group.name}</strong>
                    </span>
                    <span className="landing-chip is-muted">
                      {topRoleName(
                        member.group.ownerId === member.userId,
                        member.roles.map((r) => r.role),
                        member.roles.map((r) => r.role.id),
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </Shelf>
            <Shelf
              id="dash-plans"
              title="Saved plans"
              line="Open one to load it in its calculator."
              empty={
                u.savedScenarios.length
                  ? undefined
                  : {
                      line: "Save a production run in a calculator to find it here.",
                      href: "/tools/crafting",
                      label: "Crafting",
                    }
              }
            >
              {u.savedScenarios.map((plan) => {
                const parsed =
                  plan.kind === "production-plan"
                    ? productionPlanSchema.safeParse(plan.configuration)
                    : null;
                const href = parsed?.success
                  ? `/tools/${parsed.data.runs[0].kind}?region=${parsed.data.region}#production-plan-title`
                  : plan.kind === "flipping"
                    ? "/tools/flipping#trade"
                    : `/tools/${plan.kind === "production-plan" ? "crafting" : plan.kind}`;
                return (
                  <li key={plan.id}>
                    <Link href={href} className={`well ${styles.row}`}>
                      <span className={styles.rowCopy}>
                        <strong>{plan.title}</strong>
                        <small>Saved {day(plan.updatedAt)}</small>
                      </span>
                      <ArrowUpRight className={styles.arrow} size={16} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </Shelf>
          </div>
        </div>
      )}
    </div>
  );
}
