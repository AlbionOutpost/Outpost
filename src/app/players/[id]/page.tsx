import { notFound } from "next/navigation";
import Link from "@/components/build-region-link";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await db.user.findUnique({
    where: { id },
    select: {
      name: true,
      createdAt: true,
      builds: {
        where: { visibility: "PUBLIC", hiddenAt: null },
        select: { id: true, title: true, updatedAt: true, contentType: true },
        take: 25,
        orderBy: { updatedAt: "desc" },
      },
      compositions: {
        where: { visibility: "PUBLIC", hiddenAt: null },
        select: { id: true, title: true, updatedAt: true, contentType: true },
        take: 25,
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!u) notFound();
  return (
    <div className="support-player-profile">
      <header className="profile-identity">
        <span className="profile-initial" aria-hidden="true">
          {(u.name || "Adventurer").slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h1 className="page-title">{u.name || "Adventurer"}</h1>
          <p>
            Outpost member since{" "}
            <time dateTime={u.createdAt.toISOString()}>
              {u.createdAt.toISOString().slice(0, 10)}
            </time>
          </p>
        </div>
      </header>
      <p className="profile-identity-note">
        An Outpost community profile. Albion character ownership is not verified.
      </p>
      <nav className="profile-section-links" aria-label="Public contributions">
        <a href="#profile-builds">
          Public builds <span>{u.builds.length} shown</span>
        </a>
        <a href="#profile-comps">
          Public comps <span>{u.compositions.length} shown</span>
        </a>
      </nav>
      <div className="profile-contributions">
        <section id="profile-builds">
          <h2>Recent public builds</h2>
          {u.builds.map((build) => (
            <Link key={build.id} className="profile-work-row" href={`/builds/${build.id}`}>
              <strong>{build.title}</strong>
              <small>
                {build.contentType} · Updated {build.updatedAt.toISOString().slice(0, 10)}
              </small>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          ))}
          {!u.builds.length && (
            <div className="support-empty">
              <h3>No public builds yet</h3>
              <p>Only published, visible builds appear on this profile.</p>
              <Link className="text-link" href="/builds/library">
                Explore the build library →
              </Link>
            </div>
          )}
        </section>
        <section id="profile-comps">
          <h2>Recent public comps</h2>
          {u.compositions.map((comp) => (
            <Link key={comp.id} className="profile-work-row" href={`/compositions/${comp.id}`}>
              <strong>{comp.title}</strong>
              <small>
                {comp.contentType} · Updated {comp.updatedAt.toISOString().slice(0, 10)}
              </small>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          ))}
          {!u.compositions.length && (
            <div className="support-empty">
              <h3>No public comps yet</h3>
              <p>Private and team-only plans stay out of public profiles.</p>
              <Link className="text-link" href="/compositions/library">
                Explore group builds →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
