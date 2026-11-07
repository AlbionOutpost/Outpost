import { privateMetadata } from "@/lib/seo";
import { Compass, Shield } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { MastheadTabs } from "@/components/masthead-tabs";
import { SectionHeading } from "@/components/section-heading";
import { EmptyWell } from "@/components/empty-well";
import { WellSelect } from "@/components/well-select";
import { SearchInput } from "@/components/field";
import {
  TeamActivities,
  TeamMark,
  joiningLabel,
  plural,
  regionLabel,
  visibilityLabel,
} from "@/components/group-parts";
import { Pagination } from "@/components/pagination";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { regions } from "@/lib/albion/region-config";
import { decodeActivities, teamActivities } from "@/lib/groups/crest";
import styles from "@/components/teams.module.css";
import { LivelyCrest } from "@/components/team-crest";
export const metadata = privateMetadata("Teams");
const perPage = 24;
export default async function Groups({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const text = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const q = text("q").trim().slice(0, 80),
    region = Object.hasOwn(regions, text("region")) ? text("region") : "",
    activity = (teamActivities as readonly string[]).includes(text("activity"))
      ? text("activity")
      : "",
    // `visibility=PRIVATE` is the older link to the same filter
    joining = ["open", "private"].includes(text("joining"))
      ? text("joining")
      : text("visibility") === "PRIVATE"
        ? "private"
        : "",
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
        ...(region ? [{ region }] : []),
        ...(activity ? [{ activities: { contains: `,${activity},` } }] : []),
        ...(joining === "open" ? [{ visibility: "PUBLIC", recruiting: true }] : []),
        ...(joining === "private" ? [{ visibility: "PRIVATE" }] : []),
      ],
    },
    take: perPage + 1,
    skip: (page - 1) * perPage,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      region: true,
      visibility: true,
      crestItem: true,
      crestColor: true,
      activities: true,
      recruiting: true,
      _count: { select: { members: true } },
      members: { where: { userId: userId || "" }, select: { role: true }, take: 1 },
    },
  });
  const shown = rows.slice(0, perPage);
  // Events are member-only, so they are read only for the viewer's own teams.
  const own = shown.filter((g) => g.members.length).map((g) => g.id);
  const events = own.length
    ? await db.groupEvent.findMany({
        where: { groupId: { in: own }, cancelled: false, startsAt: { gt: new Date() } },
        select: { groupId: true, title: true },
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        take: 200,
      })
    : [];
  const nextEvent = new Map<string, string>();
  for (const e of events) if (!nextEvent.has(e.groupId)) nextEvent.set(e.groupId, e.title);
  const filtered = Boolean(q || region || activity || joining);
  // The header's Teams link opens on the player's server; that alone is not a search
  const narrowed = Boolean(q || activity || joining);
  const query = (next: Record<string, string>) =>
    `/groups?${new URLSearchParams(
      Object.entries({ q, region, activity, joining, mine: mine ? "1" : "", ...next }).filter(
        ([, v]) => v,
      ),
    )}`;
  const heading = mine ? (
    <>
      Your <em>teams</em>
    </>
  ) : narrowed ? (
    <>
      Matching <em>teams</em>
    </>
  ) : (
    <>
      Recently active <em>teams</em>
    </>
  );
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        glyph="guild"
        scene="comps"
        title={mine ? "Your teams" : "Find your team"}
        accent="team"
        description={
          mine
            ? "The teams you belong to, with their next event."
            : "Guilds and groups on your server: what they play, how big they are and whether they take new members."
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
        {mine && <input type="hidden" name="mine" value="1" />}
        <label className={styles.filterSearch}>
          <span className="sr-only">Search teams</span>
          <SearchInput
            name="q"
            defaultValue={q}
            maxLength={80}
            type="search"
            aria-label="Search teams"
            placeholder="Search by team name or description"
          />
        </label>
        <WellSelect aria-label="Team region" name="region" defaultValue={region}>
          <option value="">All servers</option>
          {Object.entries(regions).map(([value, r]) => (
            <option key={value} value={value}>
              {r.label}
            </option>
          ))}
        </WellSelect>
        <WellSelect aria-label="Team activity" name="activity" defaultValue={activity}>
          <option value="">Any activity</option>
          {teamActivities.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </WellSelect>
        <WellSelect aria-label="Joining" name="joining" defaultValue={joining}>
          <option value="">Any team</option>
          <option value="open">Recruiting now</option>
          <option value="private">Invitation only</option>
        </WellSelect>
        <button className="button secondary" type="submit">
          Find teams
        </button>
      </form>
      <section className={styles.section} aria-labelledby="team-results">
        <SectionHeading
          id="team-results"
          title={heading}
          line={
            shown.length
              ? `${plural(shown.length, "team")}${region ? ` on ${regionLabel(region)}` : ""}${rows.length > perPage ? " on this page" : ""}, last active first.`
              : undefined
          }
          link={
            filtered && shown.length
              ? { href: mine ? "/groups?mine=1" : "/groups", label: "Clear filters" }
              : undefined
          }
        />
        {shown.length ? (
          <ul className={styles.teamGrid}>
            {shown.map((g) => {
              const member = g.members.length > 0;
              const plays = decodeActivities(g.activities);
              const canAsk = !member && g.visibility === "PUBLIC" && g.recruiting;
              return (
                <li key={g.id}>
                  <article className={`raised ${styles.card}`} data-team-card="">
                    <div className={styles.cardHead}>
                      <LivelyCrest>
                        <TeamMark
                          name={g.name}
                          crestItem={g.crestItem}
                          crestColor={g.crestColor}
                          size="medium"
                        />
                      </LivelyCrest>
                      <div className={styles.cardTitle}>
                        <h3>
                          <Link
                            href={`/groups/${g.slug}`}
                            className={styles.cardLink}
                            title={g.name}
                          >
                            {g.name}
                          </Link>
                        </h3>
                        <p>
                          {regionLabel(g.region)} · {visibilityLabel(g.visibility)} ·{" "}
                          {plural(g._count.members, "member")}
                        </p>
                      </div>
                      {member && <span className="landing-chip">Your team</span>}
                    </div>
                    <p className={g.description ? styles.cardLine : styles.cardLineMuted}>
                      {g.description || "No description yet."}
                    </p>
                    <div className={styles.cardPlays}>
                      {plays.length ? (
                        <TeamActivities list={plays} />
                      ) : (
                        <span className={styles.muted}>Activities not set</span>
                      )}
                    </div>
                    <div className={`well ${styles.cardFoot}`}>
                      {member ? (
                        <span className={styles.footState}>
                          <small>Next event</small>
                          <strong>{nextEvent.get(g.id) ?? "None scheduled"}</strong>
                        </span>
                      ) : (
                        <span
                          className={styles.footState}
                          data-joining={
                            g.visibility === "PUBLIC" && g.recruiting ? "open" : "closed"
                          }
                        >
                          <small>Joining</small>
                          <strong>{joiningLabel(g)}</strong>
                        </span>
                      )}
                      <Link
                        className={`pill-link is-small ${styles.cardAction}`}
                        href={`/groups/${g.slug}${canAsk ? "#join" : ""}`}
                        aria-label={`${member ? "Open" : canAsk ? "Ask to join" : "View"} ${g.name}`}
                      >
                        {member ? "Open" : canAsk ? "Ask to join" : "View team"}
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
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
                : filtered
                  ? "Try another server or activity. Private teams only show to their members."
                  : mine
                    ? "Find a public team that plays what you play, or start one and invite your group."
                    : "Start the first one: a home for your guild's events, comps and loot splits."
            }
            action={
              mine && !userId ? (
                <Link className="button secondary" href="/signin?callbackUrl=%2Fgroups%3Fmine%3D1">
                  Sign in with Discord
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
          next={rows.length > perPage && page < 100}
          href={(next) => query({ page: String(next) })}
        />
      </section>
    </div>
  );
}
