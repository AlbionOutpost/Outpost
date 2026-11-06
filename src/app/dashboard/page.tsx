import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, Settings, ShieldCheck } from "lucide-react";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { AccountEmblem } from "@/components/account-emblem";
import { EquipmentStrip } from "@/components/equipment-strip";
import { ItemIcon } from "@/components/item-icon";
import { PanelHead } from "@/components/panel-head";
import { EmptyWell } from "@/components/empty-well";
import { NextStepCards } from "@/components/next-step-cards";
import { TeamMark, roleLabel } from "@/components/group-parts";
import { timerCategory, timerStatus, timerLeft } from "@/components/timer-labels";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { productionPlanSchema } from "@/lib/albion/production-plan";
import styles from "@/components/account.module.css";
export const metadata = privateMetadata("Dashboard");

const renderedAt = () => Date.now();
/** Up to three main-hand weapons from a stored comp's slots, as strip pieces. */
function mainHands(slots: unknown) {
  if (!Array.isArray(slots)) return [];
  return slots
    .flatMap((slot) => {
      const piece = (slot as { equipment?: unknown })?.equipment;
      const main = Array.isArray(piece)
        ? piece.find((e) => e && typeof e === "object" && e.slot === "Main hand")
        : null;
      return main && typeof main.itemId === "string"
        ? [{ slot: "Main hand", itemId: main.itemId as string, quality: Number(main.quality) || 1 }]
        : [];
    })
    .slice(0, 3);
}
const day = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);

export default async function Dashboard() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/signin");
  const u = await db.user.findUnique({
    where: { id: s.user.id },
    select: {
      name: true,
      image: true,
      region: true,
      role: true,
      builds: {
        select: {
          id: true,
          title: true,
          updatedAt: true,
          equipment: { select: { slot: true, itemId: true, quality: true } },
        },
        take: 8,
        orderBy: { updatedAt: "desc" },
      },
      compositions: {
        select: { id: true, title: true, updatedAt: true, slots: true },
        take: 8,
        orderBy: { updatedAt: "desc" },
      },
      memberships: { include: { group: { select: { name: true, slug: true } } }, take: 8 },
      timers: { where: { status: { not: "COMPLETED" } }, orderBy: { updatedAt: "desc" }, take: 8 },
      savedScenarios: {
        select: { id: true, title: true, kind: true, configuration: true, updatedAt: true },
        take: 8,
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!u) redirect("/signin");
  const now = renderedAt();
  const recent = [
    ...u.builds.map((build) => ({
      id: build.id,
      title: build.title,
      type: "Build",
      href: `/builds/${build.id}`,
      updatedAt: build.updatedAt,
      equipment: build.equipment,
    })),
    ...u.compositions.map((comp) => ({
      id: comp.id,
      title: comp.title,
      type: "Comp",
      href: `/compositions/${comp.id}`,
      updatedAt: comp.updatedAt,
      // The comp's first main hands, read loosely: a stored comp that fails validation still lists
      equipment: mainHands(comp.slots),
    })),
  ]
    .toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 8);
  const quick = [
    {
      title: "Create a build",
      note: "Full set, spells and swaps",
      href: "/builds/new",
      emblem: "strip-builds",
      scene: "build",
    },
    {
      title: "Plan a comp",
      note: "Roles and sets for the party",
      href: "/compositions/new",
      emblem: "strip-comps",
      scene: "composition",
    },
    {
      title: "Check prices",
      note: "Every city, buy and sell",
      href: "/tools/market",
      emblem: "tool-market",
      scene: "market",
    },
  ];
  const [last, ...rest] = recent;
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        icon="account"
        emblem={<AccountEmblem image={u.image} />}
        scene="guides"
        title={`Welcome, ${u.name || "Adventurer"}.`}
        accent="Welcome"
        description="Pick up your plans, check your timers and get your team ready."
        actions={
          <span className={styles.headActions}>
            {["ADMIN", "MODERATOR"].includes(u.role) && (
              <Link className="button secondary" href="/admin/reports">
                <ShieldCheck size={16} aria-hidden="true" /> Moderation queue
              </Link>
            )}
            <Link className="button secondary" href="/settings">
              <Settings size={16} aria-hidden="true" /> Settings &amp; data
            </Link>
          </span>
        }
      />
      <nav className={styles.quick} aria-label="Start something">
        {quick.map((q) => (
          <Link
            key={q.href}
            className={`raised has-scene ${styles.quickCard}`}
            data-scene={q.scene}
            href={q.href}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
            <img src={`/albion/icons/${q.emblem}.webp`} alt="" width={52} height={52} />
            <span>
              <strong>{q.title}</strong>
              <small>{q.note}</small>
            </span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </nav>
      <div className={styles.grid}>
        <section
          className={`panel ${styles.panel} ${last ? styles.wide : styles.full}`}
          aria-labelledby="recent-work-title"
        >
          <PanelHead
            id="recent-work-title"
            title="Pick up where you left off"
            line={recent.length ? "Your latest builds and comps, last edited first." : undefined}
            actions={
              <span className={styles.pills}>
                <Link className="pill-link is-small" href="/builds?mine=1">
                  My builds
                </Link>
                <Link className="pill-link is-small" href="/compositions?mine=1">
                  My comps
                </Link>
                <Link className="pill-link is-small" href="/favorites">
                  Favorites
                </Link>
              </span>
            }
          />
          {last ? (
            <>
              <Link className={`well ${styles.continue}`} href={last.href} data-dashboard-work="">
                <span className={styles.continueCopy}>
                  <small>
                    Last edited · {last.type} · {day(last.updatedAt)}
                  </small>
                  <strong>{last.title}</strong>
                  <span className="pill-link is-small">
                    Continue <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </span>
                {last.equipment.length > 0 && (
                  <EquipmentStrip
                    equipment={last.equipment}
                    slots={
                      last.type === "Comp"
                        ? ["Main hand"]
                        : ["Main hand", "Helmet", "Chest", "Boots"]
                    }
                    hideEmpty
                    size={48}
                  />
                )}
              </Link>
              {rest.length > 0 && (
                <ul className={styles.list}>
                  {rest.map((item) => (
                    <li key={`${item.type}:${item.id}`}>
                      <Link
                        className={`well ${styles.row}`}
                        href={item.href}
                        data-dashboard-work=""
                      >
                        <span className={styles.pieces}>
                          {item.type === "Comp" && item.equipment.length ? (
                            item.equipment.map((e, i) => (
                              <ItemIcon key={i} id={e.itemId} quality={e.quality} size={36} />
                            ))
                          ) : (
                            <EquipmentStrip
                              equipment={item.equipment}
                              slots={["Main hand"]}
                              size={36}
                            />
                          )}
                        </span>
                        <span className={styles.rowCopy}>
                          <strong>{item.title}</strong>
                          <small>
                            {item.type} · Edited {day(item.updatedAt)}
                          </small>
                        </span>
                        <ArrowUpRight className={styles.arrow} size={16} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <EmptyWell
              emblem="strip-comps"
              title="Nothing saved yet"
              line="Builds and comps you save show up here, ready to open again."
              action={
                <Link className="button secondary" href="/builds/new">
                  Create a build
                </Link>
              }
            />
          )}
        </section>
        <div className={last ? styles.side : `${styles.side} ${styles.sideRow}`}>
          <section className={`panel ${styles.panel}`} aria-labelledby="dash-timers">
            <PanelHead
              id="dash-timers"
              emblem="team-calendar"
              title="Timers"
              line={u.timers.length ? "Running first" : "Countdowns you set yourself"}
              actions={
                u.timers.length ? (
                  <Link href="/timers" className="pill-link is-small">
                    Manage <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                ) : undefined
              }
            />
            {u.timers.length ? (
              <ul className={styles.list}>
                {u.timers.slice(0, 4).map((timer) => (
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
              </ul>
            ) : (
              <div className={styles.emptyStack}>
                <EmptyWell
                  emblem="team-calendar"
                  title="No timers running"
                  line="Crops, laborers or a raid start: set a countdown you can check from here."
                  action={
                    <Link className="button secondary" href="/timers">
                      Add a timer
                    </Link>
                  }
                />
              </div>
            )}
          </section>
          <section className={`panel ${styles.panel}`} aria-labelledby="dash-teams">
            <PanelHead
              id="dash-teams"
              emblem="team-roles"
              title="Your teams"
              line={u.memberships.length ? "Your role in each" : "Guild workspaces you belong to"}
              actions={
                u.memberships.length ? (
                  <Link href="/groups?mine=1" className="pill-link is-small">
                    All teams <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                ) : undefined
              }
            />
            {u.memberships.length ? (
              <ul className={styles.list}>
                {u.memberships.map((member) => (
                  <li key={member.groupId}>
                    <Link className={`well ${styles.row}`} href={`/groups/${member.group.slug}`}>
                      <TeamMark name={member.group.name} size="small" />
                      <span className={styles.rowCopy}>
                        <strong>{member.group.name}</strong>
                      </span>
                      <span className="landing-chip is-muted">{roleLabel(member.role)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyStack}>
                <EmptyWell
                  emblem="team-roles"
                  title="Not in a team yet"
                  line="Join through an invitation link, or find a public team."
                  action={
                    <Link className="button secondary" href="/groups">
                      Find a team
                    </Link>
                  }
                />
              </div>
            )}
          </section>
        </div>
        <section className={`panel ${styles.panel} ${styles.full}`} aria-labelledby="dash-plans">
          <PanelHead
            id="dash-plans"
            title="Calculator plans"
            line={
              u.savedScenarios.length ? "Saved production runs; open one to load it." : undefined
            }
          />
          {u.savedScenarios.length ? (
            <ul className={styles.planGrid}>
              {u.savedScenarios.map((plan) => {
                const parsed =
                  plan.kind === "production-plan"
                    ? productionPlanSchema.safeParse(plan.configuration)
                    : null;
                const href = parsed?.success
                  ? `/tools/${parsed.data.runs[0].kind}?region=${parsed.data.region}#production-plan-title`
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
            </ul>
          ) : (
            <EmptyWell
              emblem="tool-craft"
              title="No saved plans"
              line="Save a production run in a calculator to come back to it here."
              action={
                <Link className="button secondary" href="/tools/crafting">
                  Open the crafting calculator
                </Link>
              }
            />
          )}
        </section>
      </div>
      <NextStepCards
        id="dash-next"
        title={
          <>
            Plan the next <em>run</em>
          </>
        }
        line="Cost the craft, list what to buy and read up before you leave town."
        cards={[
          {
            href: "/tools/crafting",
            emblem: "tool-craft",
            title: "Crafting Calculator",
            line: "See if a craft makes silver.",
            scene: "build",
          },
          {
            href: "/shopping-list",
            emblem: "tool-planner",
            title: "Crafting Planner",
            line: "Tick off what you have, buy the rest.",
            scene: "city",
          },
          {
            href: "/guides",
            emblem: "fame",
            title: "Guides",
            line: "Progression, gathering and PvE from players.",
            scene: "economy",
          },
        ]}
      />
    </div>
  );
}
