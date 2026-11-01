import { WorkspaceHeading } from "@/components/workspace-heading";
import { AccountEmblem } from "@/components/account-emblem";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "@/components/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { EquipmentStrip } from "@/components/equipment-strip";
import { Flag, Clock3, ArrowUpRight } from "lucide-react";
import { productionPlanSchema } from "@/lib/albion/production-plan";
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
        select: { id: true, title: true, updatedAt: true },
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
      equipment: [],
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
    {
      title: "Craft for profit",
      note: "Costs, returns and margin",
      href: "/tools/crafting",
      emblem: "tool-craft",
      scene: "city",
    },
  ];
  return (
    <div className="player-dashboard support-dashboard">
      <WorkspaceHeading
        icon="account"
        emblem={<AccountEmblem image={u.image} />}
        scene="guides"
        title={`Welcome, ${u.name || "Adventurer"}.`}
        description="Pick up your plans, check your timers, and get your team ready."
        actions={
          <Link className="button secondary" href="/settings">
            Settings & data
          </Link>
        }
      />
      <nav className="dashboard-quick" aria-label="Start something">
        {quick.map((q) => (
          <Link
            key={q.href}
            className="raised has-scene dashboard-quick-card"
            data-scene={q.scene}
            href={q.href}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/albion/icons/${q.emblem}.webp`} alt="" width={52} height={52} />
            <span>
              <strong>{q.title}</strong>
              <small>{q.note}</small>
            </span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </nav>
      <div className="dashboard-workspace">
        <section className="panel dashboard-recent" aria-labelledby="recent-work-title">
          <div className="support-section-heading">
            <h2 id="recent-work-title">Pick up where you left off</h2>
            <Link className="button primary" href="/builds/new">
              Create build
            </Link>
          </div>
          {recent[0] ? (
            <Link className="dashboard-continue" href={recent[0].href}>
              <span>
                <small>Last edited · {recent[0].type}</small>
                <strong>{recent[0].title}</strong>
                <span>
                  Continue your plan <ArrowUpRight size={15} />
                </span>
              </span>
              <EquipmentStrip
                equipment={recent[0].equipment}
                slots={["Main hand", "Helmet", "Chest", "Boots"]}
                hideEmpty
                size={44}
              />
            </Link>
          ) : (
            <div className="support-empty">
              <h3>Make room for your next adventure.</h3>
              <p>Create a loadout or plan a party. Your saved work will appear here.</p>
              <Link className="text-link" href="/compositions/new">
                Plan your first comp →
              </Link>
            </div>
          )}
          <div className="dashboard-work-list">
            {recent.slice(1).map((item) => (
              <Link key={`${item.type}:${item.id}`} href={item.href}>
                <span className="support-record-icon">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/albion/icons/${item.type === "Build" ? "strip-builds" : "strip-comps"}.webp`}
                    alt=""
                    width={30}
                    height={30}
                  />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.type} · Edited {item.updatedAt.toISOString().slice(0, 10)}
                  </small>
                </span>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
          <nav className="dashboard-collection-links" aria-label="Your saved work">
            <Link href="/builds?mine=1">My builds</Link>
            <Link href="/compositions?mine=1">My comps</Link>
            <Link href="/favorites">Favorites</Link>
          </nav>
        </section>
        <aside className="dashboard-day-plan">
          <section className="panel">
            <div className="support-section-heading">
              <h2>
                <Clock3 size={18} />
                Personal timers
              </h2>
              <Link href="/timers" className="text-link">
                Manage →
              </Link>
            </div>
            {u.timers.length ? (
              u.timers.slice(0, 4).map((timer) => (
                <p className="dashboard-timer" key={timer.id}>
                  {timer.title} · {timer.status}
                </p>
              ))
            ) : (
              <p>
                No active reminders.{" "}
                <Link className="text-link" href="/timers">
                  Add a timer
                </Link>{" "}
                for your next session.
              </p>
            )}
          </section>
          <section className="panel">
            <div className="support-section-heading">
              <h2>
                <Flag size={18} />
                Your teams
              </h2>
              <Link href="/groups?mine=1" className="text-link">
                All teams →
              </Link>
            </div>
            {u.memberships.map((member) => (
              <Link
                className="dashboard-team-link"
                key={member.groupId}
                href={`/groups/${member.group.slug}`}
              >
                <strong>{member.group.name}</strong>
                <small>{member.role.toLowerCase()}</small>
                <ArrowUpRight size={15} />
              </Link>
            ))}
            {!u.memberships.length && (
              <p>
                Join through a team invitation, or{" "}
                <Link className="text-link" href="/groups/new">
                  create a workspace
                </Link>
                .
              </p>
            )}
          </section>
        </aside>
      </div>
      <section className="panel dashboard-calculations">
        <div className="support-section-heading">
          <h2>Calculator plans</h2>
          <Link className="text-link" href="/tools">
            Open tools →
          </Link>
        </div>
        {u.savedScenarios.map((plan) => {
          const parsed =
            plan.kind === "production-plan"
              ? productionPlanSchema.safeParse(plan.configuration)
              : null;
          const href = parsed?.success
            ? `/tools/${parsed.data.runs[0].kind}?region=${parsed.data.region}#production-plan-title`
            : `/tools/${plan.kind === "production-plan" ? "crafting" : plan.kind}`;
          return (
            <div key={plan.id} className="dashboard-plan-link">
              <strong>{plan.title}</strong>
              <Link href={href} className="text-link">
                Open calculator and load plans <ArrowUpRight size={15} />
              </Link>
            </div>
          );
        })}
        {!u.savedScenarios.length && (
          <p>
            Saved calculations will appear here. You can use the public tools without saving a plan.
          </p>
        )}
      </section>
      <footer className="support-page-footnote">
        Showing up to eight recent entries per collection. Team-only plans require current
        membership.{" "}
        {["ADMIN", "MODERATOR"].includes(u.role) && (
          <Link href="/admin/reports">Open moderation queue →</Link>
        )}
      </footer>
    </div>
  );
}
