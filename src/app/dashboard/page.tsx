import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { EquipmentStrip } from "@/components/equipment-strip";
import { Swords, Users, Flag, Clock3, Coins } from "lucide-react";
import { productionPlanSchema } from "@/lib/albion/production-plan";
export default async function Dashboard() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/signin");
  const u = await db.user.findUnique({
    where: { id: s.user.id },
    select: {
      name: true,
      region: true,
      role: true,
      builds: {
        select: {
          id: true,
          title: true,
          equipment: { select: { slot: true, itemId: true, quality: true } },
        },
        take: 8,
        orderBy: { updatedAt: "desc" },
      },
      compositions: { select: { id: true, title: true }, take: 8, orderBy: { updatedAt: "desc" } },
      memberships: { include: { group: { select: { name: true, slug: true } } }, take: 8 },
      timers: { where: { status: { not: "COMPLETED" } }, orderBy: { updatedAt: "desc" }, take: 8 },
      savedScenarios: {
        select: { id: true, title: true, kind: true, configuration: true },
        take: 8,
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!u) redirect("/signin");
  return (
    <div className="player-dashboard">
      <div className="eyebrow">YOUR OUTPOST · {u.region}</div>
      <h1 className="page-title display-title">Welcome, {u.name || "Adventurer"}.</h1>
      <div className="actions">
        <Link className="button primary" href="/builds/new">
          Create build
        </Link>
        <Link className="button secondary" href="/compositions/new">
          Create comp
        </Link>
        <Link className="button secondary" href="/settings">
          Settings & data
        </Link>
        <Link className="button secondary" href="/favorites">
          Favorites
        </Link>
        {["ADMIN", "MODERATOR"].includes(u.role) && (
          <Link className="button secondary" href="/admin/reports">
            Moderation queue
          </Link>
        )}
      </div>
      <nav className="player-hub-shortcuts" aria-label="Your recent workspace">
        <Link href="/builds?mine=1">
          <Swords size={20} />
          <span>Recent builds</span>
          <strong>{u.builds.length}</strong>
        </Link>
        <Link href="/compositions?mine=1">
          <Users size={20} />
          <span>Recent comps</span>
          <strong>{u.compositions.length}</strong>
        </Link>
        <Link href="/groups?mine=1">
          <Flag size={20} />
          <span>Your guilds</span>
          <strong>{u.memberships.length}</strong>
        </Link>
        <Link href="/timers">
          <Clock3 size={20} />
          <span>Active timers</span>
          <strong>{u.timers.length}</strong>
        </Link>
      </nav>
      <div className="player-hub-grid section">
        <section className="panel">
          <h2>
            <Swords size={18} />
            Your recent builds
          </h2>
          {u.builds.map((b) => (
            <Link className="player-loadout-link" href={`/builds/${b.id}`} key={b.id}>
              <span>
                <strong>{b.title}</strong>
                <small>Open your saved equipment</small>
              </span>
              <EquipmentStrip equipment={b.equipment} size={28} />
            </Link>
          ))}
          {!u.builds.length && <p>No saved builds yet.</p>}
        </section>
        <section className="panel">
          <h2>
            <Users size={18} />
            Your recent comps
          </h2>
          {u.compositions.map((c) => (
            <p key={c.id}>
              <Link className="text-link" href={`/compositions/${c.id}`}>
                {c.title}
              </Link>
            </p>
          ))}
          {!u.compositions.length && <p>No saved comps yet.</p>}
        </section>
        <section className="panel">
          <h2>
            <Flag size={18} />
            Your groups
          </h2>
          {u.memberships.map((m) => (
            <p key={m.groupId}>
              <Link className="text-link" href={`/groups/${m.group.slug}`}>
                {m.group.name}
              </Link>{" "}
              · {m.role}
            </p>
          ))}
          {!u.memberships.length && <p>No group memberships yet.</p>}
        </section>
        <section className="panel">
          <h2>
            <Clock3 size={18} />
            Personal timers
          </h2>
          {u.timers.map((t) => (
            <p key={t.id}>
              {t.title} · {t.status}
            </p>
          ))}
          {!u.timers.length && <p>No active personal timers.</p>}
          <Link className="text-link" href="/timers">
            Manage timers
          </Link>
        </section>
        <section className="panel">
          <h2>
            <Coins size={18} />
            Recent calculator plans
          </h2>
          {u.savedScenarios.map((c) => {
            const plan =
              c.kind === "production-plan" ? productionPlanSchema.safeParse(c.configuration) : null;
            const href = plan?.success
              ? `/tools/${plan.data.runs[0].kind}?region=${plan.data.region}#production-plan-title`
              : `/tools/${c.kind === "production-plan" ? "crafting" : c.kind}`;
            return (
              <p key={c.id}>
                {c.title} ·{" "}
                <Link className="text-link" href={href}>
                  Open calculator and load plans
                </Link>
              </p>
            );
          })}
          {!u.savedScenarios.length && <p>No saved calculator plans yet.</p>}
        </section>
      </div>
      <p className="muted">
        Showing up to eight recent entries per section. Guild-only comps require current membership.
      </p>
    </div>
  );
}
