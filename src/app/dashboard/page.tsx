import "@/app/build-styles";
import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, Settings, ShieldCheck } from "lucide-react";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { AccountEmblem } from "@/components/account-emblem";
import { PanelHead } from "@/components/panel-head";
import { EmptyWell } from "@/components/empty-well";
import { SectionHeading } from "@/components/section-heading";
import { NextStepCards } from "@/components/next-step-cards";
import { CommunityBuildCard } from "@/components/community-build-card";
import { CompGrid, CompWindow } from "@/components/comp-window";
import { RosterRows, type RosterMember } from "@/components/comp-roster";
import { TeamMark, roleLabel } from "@/components/group-parts";
import { timerCategory, timerStatus, timerLeft } from "@/components/timer-labels";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { listAccountBuilds } from "@/lib/builds/discovery-service";
import { productionPlanSchema } from "@/lib/albion/production-plan";
import account from "@/components/account.module.css";
import styles from "./dashboard.module.css";
export const metadata = privateMetadata("Dashboard");

const renderedAt = () => Date.now();
/** A stored comp's members as roster rows, read loosely: a comp that fails validation still lists. */
function rosterOf(slots: unknown): { total: number; members: RosterMember[] } {
  if (!Array.isArray(slots)) return { total: 0, members: [] };
  const members = slots.slice(0, 5).map((slot, i): RosterMember => {
    const s = (slot ?? {}) as { role?: unknown; customRole?: unknown; equipment?: unknown };
    const role =
      s.role === "Custom" && typeof s.customRole === "string"
        ? s.customRole
        : typeof s.role === "string"
          ? s.role
          : "Open slot";
    const main = Array.isArray(s.equipment)
      ? s.equipment.find((e) => e && typeof e === "object" && e.slot === "Main hand")
      : null;
    const itemId = main && typeof main.itemId === "string" ? (main.itemId as string) : null;
    return {
      key: `${i}`,
      weapon: itemId ? { itemId, quality: Number(main.quality) || 1 } : undefined,
      name: itemId ? equipmentName(itemId) : "No weapon chosen",
      role,
      tone: role,
      armor: [],
    };
  });
  return { total: slots.length, members };
}
const day = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);

/**
 * The signed-in hub, in the landing's language: your latest builds and comps as the same windows
 * the rest of the site uses, then your Teams, timers and saved calculator plans side by side,
 * each with one way in and its own empty state.
 */
export default async function Dashboard() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/signin");
  const [u, mine] = await Promise.all([
    db.user.findUnique({
      where: { id: s.user.id },
      select: {
        name: true,
        image: true,
        role: true,
        compositions: {
          select: { id: true, title: true, updatedAt: true, slots: true },
          take: 3,
          orderBy: { updatedAt: "desc" },
        },
        memberships: { include: { group: { select: { name: true, slug: true } } }, take: 5 },
        timers: {
          where: { status: { not: "COMPLETED" } },
          orderBy: { updatedAt: "desc" },
          take: 4,
        },
        savedScenarios: {
          select: { id: true, title: true, kind: true, configuration: true, updatedAt: true },
          take: 5,
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
  if (!u) redirect("/signin");
  const now = renderedAt();
  const builds = mine.builds.slice(0, 3);
  return (
    <div className={account.page}>
      <WorkspaceHeading
        icon="account"
        emblem={<AccountEmblem image={u.image} />}
        scene="guides"
        title={`Welcome, ${u.name || "Adventurer"}.`}
        accent="Welcome"
        description="Your builds, comps, Teams, timers and plans in one place."
        actions={
          <span className={account.headActions}>
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
      <section className={styles.section} aria-labelledby="dash-builds">
        <SectionHeading
          id="dash-builds"
          title={
            <>
              Your <em>builds</em>
            </>
          }
          line={
            mine.total
              ? `${mine.total.toLocaleString("en-GB")} saved, last edited first.`
              : "Loadouts you make or copy are kept on your account."
          }
          link={mine.total ? { href: "/builds?mine=1", label: "All your builds" } : undefined}
        />
        {builds.length ? (
          <ul className={styles.windows}>
            {builds.map((b) => (
              <li key={b.id} data-dashboard-work="">
                <CommunityBuildCard
                  build={b}
                  authenticated
                  saved={b.favorites.length > 0}
                  favoriteCount={b._count.favorites}
                  owned
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyWell
            emblem="strip-builds"
            title="No builds yet"
            line="Start from an empty board, or copy one from the library and change the pieces."
            action={
              <Link className="button secondary" href="/builds/new">
                Create a build
              </Link>
            }
          />
        )}
      </section>
      <section className={styles.section} aria-labelledby="dash-comps">
        <SectionHeading
          id="dash-comps"
          title={
            <>
              Your <em>comps</em>
            </>
          }
          line={
            u.compositions.length
              ? "Party plans you made, last edited first."
              : "Plan who plays what, then share it with your Team."
          }
          link={
            u.compositions.length
              ? { href: "/compositions?mine=1", label: "All your comps" }
              : undefined
          }
        />
        {u.compositions.length ? (
          <CompGrid>
            {u.compositions.map((c) => {
              const roster = rosterOf(c.slots);
              return (
                <li key={c.id} data-dashboard-work="">
                  <CompWindow
                    title={c.title}
                    href={`/compositions/${c.id}`}
                    total={roster.total}
                    noun="member"
                    byline={`Edited ${day(c.updatedAt)}`}
                  >
                    {roster.members.length ? (
                      <RosterRows members={roster.members} label={`${c.title} roster`} />
                    ) : (
                      <p className="landing-window-empty">No members planned yet.</p>
                    )}
                  </CompWindow>
                </li>
              );
            })}
          </CompGrid>
        ) : (
          <EmptyWell
            emblem="strip-comps"
            title="No comps yet"
            line="Give each slot a role and a loadout, or copy a Group Build."
            action={
              <Link className="button secondary" href="/compositions/new">
                Plan a comp
              </Link>
            }
          />
        )}
      </section>
      <div className={styles.trio}>
        <section className={`panel ${account.panel}`} aria-labelledby="dash-teams">
          <PanelHead
            id="dash-teams"
            emblem="team-roles"
            title="Your Teams"
            line={u.memberships.length ? "Your role in each" : "Guild workspaces you belong to"}
            actions={
              u.memberships.length ? (
                <Link href="/groups?mine=1" className="pill-link is-small">
                  All <ArrowRight size={14} aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />
          {u.memberships.length ? (
            <ul className={account.list}>
              {u.memberships.map((member) => (
                <li key={member.groupId}>
                  <Link className={`well ${account.row}`} href={`/groups/${member.group.slug}`}>
                    <TeamMark name={member.group.name} size="small" />
                    <span className={account.rowCopy}>
                      <strong>{member.group.name}</strong>
                    </span>
                    <span className="landing-chip is-muted">{roleLabel(member.role)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyWell
              title="Not in a Team yet"
              line="Join through an invitation link, or find a public Team."
              action={
                <Link className="button secondary" href="/groups">
                  Find a Team
                </Link>
              }
            />
          )}
        </section>
        <section className={`panel ${account.panel}`} aria-labelledby="dash-timers">
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
            <ul className={account.list}>
              {u.timers.map((timer) => (
                <li key={timer.id} className={`well ${account.row}`} data-dashboard-timer="">
                  <span className={account.rowCopy}>
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
            <EmptyWell
              title="No timers running"
              line="Crops, laborers or a raid start: set a countdown and check it here."
              action={
                <Link className="button secondary" href="/timers">
                  Add a timer
                </Link>
              }
            />
          )}
        </section>
        <section className={`panel ${account.panel}`} aria-labelledby="dash-plans">
          <PanelHead
            id="dash-plans"
            emblem="tool-craft"
            title="Calculator plans"
            line={u.savedScenarios.length ? "Open one to load it" : "Production runs you save"}
          />
          {u.savedScenarios.length ? (
            <ul className={account.list}>
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
                    <Link href={href} className={`well ${account.row}`}>
                      <span className={account.rowCopy}>
                        <strong>{plan.title}</strong>
                        <small>Saved {day(plan.updatedAt)}</small>
                      </span>
                      <ArrowUpRight className={account.arrow} size={16} aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyWell
              title="No saved plans"
              line="Save a production run in a calculator to come back to it here."
              action={
                <Link className="button secondary" href="/tools/crafting">
                  Open crafting
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
            href: "/tools/market",
            emblem: "tool-market",
            title: "Market Explorer",
            line: "Every city, buy and sell orders.",
            scene: "market",
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
