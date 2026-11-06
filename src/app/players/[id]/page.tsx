import { privateMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "@/components/build-region-link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { SectionHeading } from "@/components/section-heading";
import { EmptyWell } from "@/components/empty-well";
import { NextStepCards } from "@/components/next-step-cards";
import { CommunityBuildCard } from "@/components/community-build-card";
import { CompGrid, CompWindow } from "@/components/comp-window";
import { RosterRows } from "@/components/comp-roster";
import { readStoredComposition } from "@/lib/compositions/stored";
import { slotRosterMember } from "@/lib/compositions/roster";
import { plural } from "@/components/group-parts";
import styles from "@/components/account.module.css";
export const metadata = privateMetadata("Player profile");

const since = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);

export default async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = (await getServerSession(authOptions))?.user?.id;
  const u = await db.user.findUnique({
    where: { id },
    select: {
      name: true,
      createdAt: true,
      builds: {
        where: { visibility: "PUBLIC", hiddenAt: null },
        select: {
          id: true,
          title: true,
          description: true,
          contentType: true,
          visibility: true,
          version: true,
          updatedAt: true,
          authorId: true,
          equipment: true,
          author: { select: { name: true } },
          favorites: { where: { userId: viewer || "" }, select: { userId: true }, take: 1 },
          _count: { select: { favorites: true } },
        },
        take: 24,
        orderBy: { updatedAt: "desc" },
      },
      compositions: {
        where: { visibility: "PUBLIC", hiddenAt: null },
        select: {
          id: true,
          title: true,
          description: true,
          visibility: true,
          contentType: true,
          region: true,
          notes: true,
          groupId: true,
          version: true,
          updatedAt: true,
          slots: true,
        },
        take: 24,
        orderBy: { updatedAt: "desc" },
      },
      comments: {
        where: {
          hiddenAt: null,
          deletedAt: null,
          OR: [
            { build: { visibility: "PUBLIC", hiddenAt: null } },
            { composition: { visibility: "PUBLIC", hiddenAt: null } },
          ],
        },
        select: { id: true },
        take: 1,
      },
    },
  });
  // A profile exists only for someone who already shows their name in public (a public build or
  // comp, or a visible comment on one) or for its own account. Other account IDs reveal nothing.
  if (!u || (!u.builds.length && !u.compositions.length && !u.comments.length && viewer !== id))
    notFound();
  const name = u.name || "Adventurer";
  const words = name.trim().split(/\s+/);
  return (
    <div className={styles.page}>
      <WorkspaceHeading
        scene="builds"
        emblem={
          <span className={styles.initial} aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </span>
        }
        title={name}
        accent={words.length > 1 ? words.at(-1) : undefined}
        description={`Builds and comps ${name} has published on Outpost.`}
      >
        <div className={`landing-chips ${styles.chips}`}>
          <span className="landing-chip">
            <time dateTime={u.createdAt.toISOString()}>Member since {since(u.createdAt)}</time>
          </span>
          <span className="landing-chip is-muted">{plural(u.builds.length, "public build")}</span>
          <span className="landing-chip is-muted">
            {plural(u.compositions.length, "public comp")}
          </span>
          <span className="landing-chip is-muted">Albion character not verified</span>
        </div>
      </WorkspaceHeading>
      <section className={styles.profileSection} aria-labelledby="profile-builds">
        <SectionHeading
          id="profile-builds"
          title={
            <>
              Public <em>builds</em>
            </>
          }
          line={u.builds.length ? "Last updated first." : undefined}
        />
        {u.builds.length ? (
          <div className={styles.windowGrid}>
            {u.builds.map((b) => (
              <CommunityBuildCard
                key={b.id}
                build={b}
                authenticated={!!viewer}
                saved={b.favorites.length > 0}
                favoriteCount={b._count.favorites}
                owned={b.authorId === viewer}
              />
            ))}
          </div>
        ) : (
          <EmptyWell
            emblem="strip-builds"
            title="No public builds yet"
            line="Only published, visible builds show on a profile."
            action={
              <Link className="button secondary" href="/builds/library">
                Browse the build library
              </Link>
            }
          />
        )}
      </section>
      <section className={styles.profileSection} aria-labelledby="profile-comps">
        <SectionHeading
          id="profile-comps"
          title={
            <>
              Public <em>comps</em>
            </>
          }
          line={u.compositions.length ? "Last updated first." : undefined}
        />
        {u.compositions.length ? (
          <CompGrid>
            {u.compositions.map((r) => {
              const { composition } = readStoredComposition(r);
              const players = composition.slots.length;
              return (
                <li key={r.id}>
                  <CompWindow
                    title={r.title}
                    href={`/compositions/${r.id}`}
                    chips={<span className="landing-chip">{r.contentType}</span>}
                    total={players}
                    noun="player"
                    byline={`By ${name}`}
                  >
                    {players ? (
                      <RosterRows
                        members={composition.slots.map((slot) => slotRosterMember(slot))}
                        label={`${r.title} roster`}
                      />
                    ) : (
                      <p className="landing-window-empty">Roster unavailable.</p>
                    )}
                  </CompWindow>
                </li>
              );
            })}
          </CompGrid>
        ) : (
          <EmptyWell
            emblem="strip-comps"
            title="No public comps yet"
            line="Private and team-only comps never show on a profile."
            action={
              <Link className="button secondary" href="/compositions/library">
                Browse Group Builds
              </Link>
            }
          />
        )}
      </section>
      <NextStepCards
        id="profile-next"
        title={
          <>
            Make it your <em>own</em>
          </>
        }
        line="Copy a loadout into the editor, or start a comp around it."
        cards={[
          {
            href: "/builds/new",
            emblem: "tool-craft",
            title: "Create a build",
            line: "Full set, spells and swaps.",
            scene: "build",
          },
          {
            href: "/compositions/new",
            emblem: "team-comps",
            title: "Plan a comp",
            line: "Roles and sets for the party.",
            scene: "composition",
          },
          {
            href: "/builds/library",
            emblem: "strip-content",
            title: "Build library",
            line: "Hundreds of recorded builds by activity.",
            scene: "city",
          },
        ]}
      />
    </div>
  );
}
