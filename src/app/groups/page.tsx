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
    visibility = text("visibility");
  const page = Math.min(100, Math.max(1, Number.parseInt(text("page"), 10) || 1));
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const rows = await db.group.findMany({
    where: {
      AND: [
        { OR: [{ visibility: "PUBLIC" }, ...(userId ? [{ members: { some: { userId } } }] : [])] },
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
    `/groups?${new URLSearchParams({ q, region, visibility, page: String(next) })}`;
  return (
    <div className="guild-discovery-page">
      <header className="section-heading guild-discovery-heading">
        <div>
          <h1 className="page-title display-title">Guilds</h1>
          <p className="intro">
            Find a guild workspace or return to your own guild’s events, builds and comps.
          </p>
        </div>
        <Link href="/groups/new" className="button primary">
          Create workspace
        </Link>
      </header>
      <form
        action="/groups"
        className="guild-discovery-filters"
        aria-label="Guild discovery filters"
      >
        <label>
          Search guilds
          <input
            name="q"
            defaultValue={q}
            maxLength={80}
            type="search"
            placeholder="Guild name or description"
          />
        </label>
        <label>
          Guild region
          <select aria-label="Guild region" name="region" defaultValue={region}>
            <option value="">All regions</option>
            {Object.entries(regions).map(([value, r]) => (
              <option key={value} value={value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Guild visibility
          <select aria-label="Guild visibility" name="visibility" defaultValue={visibility}>
            <option value="">All guilds</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
        </label>
        <button className="button secondary" type="submit">
          Find guilds
        </button>
      </form>
      <p className="guild-discovery-context">
        Public guilds and your memberships. Private workspaces stay visible only to their members.
      </p>
      <div className="guild-discovery-list">
        {rows.slice(0, 25).map((g) => (
          <article className="guild-discovery-card" key={g.id}>
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
            <p>{g.description || "No guild description has been added."}</p>
            <footer>
              <span>
                {g._count.members.toLocaleString()} {g._count.members === 1 ? "member" : "members"}
                {g.members.length ? " · Your guild" : ""}
              </span>
              <Link className="text-link" href={`/groups/${g.slug}`}>
                {g.members.length ? "Open workspace" : "View guild"} →
              </Link>
            </footer>
          </article>
        ))}
      </div>
      {!rows.length && (
        <section className="guild-discovery-empty">
          <span className="eyebrow">GUILD DISCOVERY</span>
          <h2>No matching guilds</h2>
          <p>
            Try another name or region. Private guilds appear after you join through an invitation
            or an approved request.
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
        <nav className="guild-discovery-pagination" aria-label="Guild result pages">
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
