import { WorkspaceHeading } from "@/components/workspace-heading";
import { MastheadTabs } from "@/components/masthead-tabs";
import { Compass, Shield } from "lucide-react";
import Link from "@/components/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { regions } from "@/lib/albion/region-config";
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
  const url = (next: number) =>
    `/groups?${new URLSearchParams({ q, region, visibility, mine: mine ? "1" : "0", page: String(next) })}`;
  return (
    <div className="guild-discovery-page support-team-directory">
      <WorkspaceHeading
        glyph="guild"
        scene="comps"
        title="Teams"
        description="Find a team workspace or return to your own team’s events, builds and comps."
        actions={
          <Link href="/groups/new" className="button primary">
            Create workspace
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
        className="raised guild-discovery-filters"
        aria-label="Team discovery filters"
      >
        <input type="hidden" name="mine" value={mine ? "1" : "0"} />
        <label>
          Search teams
          <input
            name="q"
            defaultValue={q}
            maxLength={80}
            type="search"
            placeholder="Team name or description"
          />
        </label>
        <label>
          Team region
          <select aria-label="Team region" name="region" defaultValue={region}>
            <option value="">All regions</option>
            {Object.entries(regions).map(([value, r]) => (
              <option key={value} value={value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Team visibility
          <select aria-label="Team visibility" name="visibility" defaultValue={visibility}>
            <option value="">All teams</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
        </label>
        <button className="button secondary" type="submit">
          Find teams
        </button>
      </form>
      <p className="guild-discovery-context">
        {mine
          ? "Your current memberships. Private workspaces remain member-only."
          : "Public teams and your memberships. Private workspaces stay visible only to their members."}
      </p>
      <div className="guild-discovery-list">
        {rows.slice(0, 25).map((g) => (
          <article
            className="raised has-scene guild-discovery-card"
            data-scene="composition"
            key={g.id}
          >
            <div className="guild-discovery-card-heading">
              <span className="guild-directory-mark" aria-hidden="true">
                {g.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join("")
                  .toUpperCase()}
              </span>
              <div>
                <span className="eyebrow">
                  {regions[g.region as keyof typeof regions]?.label || g.region}
                </span>
                <h2>
                  <Link href={`/groups/${g.slug}`}>{g.name}</Link>
                </h2>
              </div>
              <span className="guild-visibility">
                {g.visibility === "PUBLIC" ? "Public" : "Private"}
              </span>
            </div>
            <p>{g.description || "No team description has been added."}</p>
            <footer>
              <span>
                {g._count.members.toLocaleString()} {g._count.members === 1 ? "member" : "members"}
                {g.members.length ? " · Your team" : ""}
              </span>
              <Link className="text-link" href={`/groups/${g.slug}`}>
                {g.members.length ? "Open workspace" : "View team"} →
              </Link>
            </footer>
          </article>
        ))}
      </div>
      {!rows.length && (
        <section className="raised guild-discovery-empty">
          <span className="eyebrow">Team discovery</span>
          <h2>{mine ? "No teams in this view" : "No matching teams"}</h2>
          {mine && !userId && (
            <Link className="button primary" href="/signin?callbackUrl=%2Fgroups%3Fmine%3D1">
              Sign in to see your teams
            </Link>
          )}
          <p>
            Try another name or region. Private teams appear after you join through an invitation or
            an approved request.
          </p>
          <div className="button-row">
            <Link className="button secondary" href="/groups">
              Clear filters
            </Link>
            <Link className="text-link" href="/groups/new">
              Create a workspace →
            </Link>
          </div>
        </section>
      )}
      {(page > 1 || rows.length > 25) && (
        <nav className="guild-discovery-pagination" aria-label="Team result pages">
          {page > 1 && (
            <Link className="button secondary" href={url(page - 1)}>
              Previous
            </Link>
          )}
          <span>Page {page}</span>
          {rows.length > 25 && page < 100 && (
            <Link className="button secondary" href={url(page + 1)}>
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
