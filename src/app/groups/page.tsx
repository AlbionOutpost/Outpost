import { privateMetadata } from "@/lib/seo";
import { ArrowUpRight, Compass, Shield } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { MastheadTabs } from "@/components/masthead-tabs";
import { SectionHeading } from "@/components/section-heading";
import { EmptyWell } from "@/components/empty-well";
import { WellSelect } from "@/components/well-select";
import { SearchInput } from "@/components/field";
import {
  TeamMark,
  TeamNextSteps,
  plural,
  regionLabel,
  visibilityLabel,
} from "@/components/group-parts";
import { Pagination } from "@/components/pagination";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { regions } from "@/lib/albion/region-config";
import "@/app/landing-window.css";
import windows from "@/components/landing/windows.module.css";
import styles from "@/components/teams.module.css";
export const metadata = privateMetadata("Teams");
export default async function Groups({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const text = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const q = text("q").trim().slice(0, 80),
    region = text("region"),
    visibility = text("visibility"),
    mine = text("mine") === "1";
  const page = Math.min(100, Math.max(1, Number.parseInt(text("page"), 10) || 1));
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const rows = await db.group.findMany({
    where: {
      AND: [
        { OR: [{ visibility: "PUBLIC" }, ...(userId ? [{ members: { some: { userId } } }] : [])] },
        ...(mine ? [{ members: { some: { userId: userId || "" } } }] : []),
        ...(q
          ? [
              {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  { description: { contains: q, mode: "insensitive" as const } },
                ],
              },
            ]
          : []),
        ...(["europe", "americas", "asia"].includes(region) ? [{ region }] : []),
        ...(["PUBLIC", "PRIVATE"].includes(visibility) ? [{ visibility }] : []),
      ],
    },
    take: 26,
    skip: (page - 1) * 25,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      region: true,
      visibility: true,
      _count: { select: { members: true } },
      members: { where: { userId: userId || "" }, select: { role: true }, take: 1 },
    },
  });
  // Events and comps are member-only, so they are read only for the viewer's own teams.
  const own = rows.filter((g) => g.members.length).map((g) => g.id);
  const [events, comps] = own.length
    ? await Promise.all([
        db.groupEvent.findMany({
          where: { groupId: { in: own }, cancelled: false, startsAt: { gt: new Date() } },
          select: { groupId: true, title: true },
          orderBy: [{ startsAt: "asc" }, { id: "asc" }],
          take: 200,
        }),
        db.composition.findMany({
          where: { groupId: { in: own }, visibility: "GROUP", hiddenAt: null },
          select: { groupId: true },
          take: 2000,
        }),
      ])
    : [[], []];
  const nextEvent = new Map<string, string>();
  for (const e of events) if (!nextEvent.has(e.groupId)) nextEvent.set(e.groupId, e.title);
  const compCount = new Map<string, number>();
  for (const c of comps)
    if (c.groupId) compCount.set(c.groupId, (compCount.get(c.groupId) ?? 0) + 1);
  const filtered = Boolean(q || region || visibility);
  const shown = rows.slice(0, 25);
  const url = (next: number) =>
    `/groups?${new URLSearchParams({ q, region, visibility, mine: mine ? "1" : "0", page: String(next) })}`;
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="guild"
        scene="comps"
        title={mine ? "Your teams" : "Find a team"}
        accent={mine ? "teams" : "team"}
        description={
          mine
            ? "The teams you belong to, with their events, comps and loot splits."
            : "Public teams and your own. Private teams stay hidden from everyone who is not a member."
        }
        actions={
          <Link href="/groups/new" className="button primary">
            Create a team
          </Link>
        }
      >
        <MastheadTabs
          label="Team collections"
          tabs={[
            {
              href: "/groups",
              label: "Discover teams",
              icon: <Compass size={16} />,
              current: !mine,
            },
            {
              href: "/groups?mine=1",
              label: "My teams",
              icon: <Shield size={16} />,
              current: mine,
            },
          ]}
        />
      </WorkspaceHeading>
      <form
        action="/groups"
        className={`raised ${styles.filters}`}
        role="search"
        aria-label="Team discovery filters"
      >
        <input type="hidden" name="mine" value={mine ? "1" : "0"} />
        <label className={styles.filterSearch}>
          <span>Search teams</span>
          <SearchInput
            name="q"
            defaultValue={q}
            maxLength={80}
            type="search"
            aria-label="Search teams"
            placeholder="Team name or description"
          />
        </label>
        <label>
          <span>Region</span>
          <WellSelect aria-label="Team region" name="region" defaultValue={region}>
            <option value="">All regions</option>
            {Object.entries(regions).map(([value, r]) => (
              <option key={value} value={value}>
                {r.label}
              </option>
            ))}
          </WellSelect>
        </label>
        <label>
          <span>Visibility</span>
          <WellSelect aria-label="Team visibility" name="visibility" defaultValue={visibility}>
            <option value="">All teams</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </WellSelect>
        </label>
        <button className="button secondary" type="submit">
          Find teams
        </button>
      </form>
      <section className={styles.section} aria-labelledby="team-results">
        <SectionHeading
          id="team-results"
          title={
            shown.length ? (
              mine ? (
                <>
                  Your <em>teams</em>
                </>
              ) : filtered ? (
                <>
                  Matching <em>teams</em>
                </>
              ) : (
                <>
                  Recently active <em>teams</em>
                </>
              )
            ) : mine ? (
              <>
                Your <em>teams</em>
              </>
            ) : (
              <>
                Matching <em>teams</em>
              </>
            )
          }
          line={
            shown.length
              ? `${plural(shown.length, "team")}${rows.length > 25 ? " on this page" : ""}, last active first.`
              : undefined
          }
        />
        {shown.length ? (
          <ul className={`${windows.windows} ${styles.teamGrid}`}>
            {shown.map((g) => (
              <li key={g.id}>
                <article
                  className={`raised has-scene landing-window ${windows.window} ${styles.teamWindow}`}
                  data-scene="composition"
                  data-team-card=""
                >
                  <div className={`landing-window-bar ${windows.bar}`}>
                    <Link
                      href={`/groups/${g.slug}`}
                      className="landing-window-title"
                      title={g.name}
                    >
                      <h3 className={styles.windowTitle}>{g.name}</h3>
                    </Link>
                    <span className="landing-chips">
                      {g.members.length > 0 && <span className="landing-chip">Your team</span>}
                      <span className="landing-chip is-muted">{visibilityLabel(g.visibility)}</span>
                    </span>
                  </div>
                  <div className={`landing-window-body ${windows.body} ${styles.teamBody}`}>
                    <p className={g.description ? styles.teamLine : styles.teamLineMuted}>
                      {g.description || "No description yet."}
                    </p>
                    <ul className={styles.teamFacts}>
                      <li className="well">
                        <span>Members</span>
                        <span>{g._count.members.toLocaleString("en")}</span>
                      </li>
                      {g.members.length ? (
                        <>
                          <li className="well">
                            <span>Next event</span>
                            <span>{nextEvent.get(g.id) ?? "None scheduled"}</span>
                          </li>
                          <li className="well">
                            <span>Shared comps</span>
                            <span>{(compCount.get(g.id) ?? 0).toLocaleString("en")}</span>
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="well">
                            <span>Region</span>
                            <span>{regionLabel(g.region)}</span>
                          </li>
                          <li className="well">
                            <span>Joining</span>
                            <span>
                              {g.visibility === "PUBLIC" ? "Ask to join" : "By invitation"}
                            </span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                  <Link
                    href={`/groups/${g.slug}`}
                    className={`landing-window-foot ${windows.foot} ${styles.teamFoot}`}
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <TeamMark name={g.name} size="small" />
                    <span>
                      <strong>{g.members.length ? "Open workspace" : "View team"}</strong>
                      <small>
                        {regionLabel(g.region)} · {visibilityLabel(g.visibility)}
                      </small>
                    </span>
                    <ArrowUpRight size={20} aria-hidden="true" />
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyWell
            emblem="team-roles"
            title={
              mine && !userId
                ? "Sign in to see your teams"
                : filtered
                  ? "No matching teams"
                  : mine
                    ? "You are not in a team yet"
                    : "No public teams yet"
            }
            line={
              mine && !userId
                ? "Teams you belong to show up here once you sign in with Discord."
                : "Private teams only appear after you join through an invitation or an approved request."
            }
            action={
              mine && !userId ? (
                <Link className="button secondary" href="/signin?callbackUrl=%2Fgroups%3Fmine%3D1">
                  Sign in to see your teams
                </Link>
              ) : filtered ? (
                <Link className="button secondary" href={mine ? "/groups?mine=1" : "/groups"}>
                  Clear filters
                </Link>
              ) : mine ? (
                <Link className="button secondary" href="/groups">
                  Discover teams
                </Link>
              ) : (
                <Link className="button secondary" href="/groups/new">
                  Create a team
                </Link>
              )
            }
          />
        )}
        <Pagination
          label="Team result pages"
          page={page}
          next={rows.length > 25 && page < 100}
          href={url}
        />
      </section>
      <TeamNextSteps />
    </div>
  );
}
