import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { Search } from "lucide-react";
import { libraryCounts } from "@/lib/grind-library";
import Link from "@/components/build-region-link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { readStoredComposition } from "@/lib/compositions/stored";
import { slotRosterMember } from "@/lib/compositions/roster";
import { RosterRows } from "@/components/comp-roster";
import { CompTabs } from "@/components/comp-tabs";
import { CompPages, CompWindow } from "@/components/comp-window";
import { CompNextSteps } from "@/components/comp-next-steps";
import { SectionHeading } from "@/components/section-heading";
import { EmptyWell } from "@/components/empty-well";
import styles from "@/components/comps.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/compositions", await searchParams);
}
export default async function Compositions({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mine?: string; page?: string }>;
}) {
  const p = await searchParams;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const page = z.coerce.number().int().min(1).max(1000).catch(1).parse(p.page);
  const q = (p.q || "").slice(0, 100);
  const rows = await db.composition.findMany({
    where: {
      hiddenAt: null,
      AND: [
        {
          OR: [
            { visibility: "PUBLIC" },
            ...(userId
              ? [
                  { authorId: userId, visibility: "PRIVATE" as const },
                  { visibility: "GROUP" as const, group: { members: { some: { userId } } } },
                ]
              : []),
          ],
        },
        ...(p.mine === "1" ? [{ authorId: userId || "__anonymous__" }] : []),
        ...(q ? [{ title: { contains: q, mode: "insensitive" as const } }] : []),
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: 25,
    skip: (page - 1) * 24,
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
      author: { select: { name: true } },
    },
  });
  const mine = p.mine === "1";
  const shown = rows.slice(0, 24);
  const visibility = { PUBLIC: "Public", PRIVATE: "Private", GROUP: "Team only" } as const;
  const href = (n: number) =>
    `/compositions?${new URLSearchParams({ ...(q ? { q } : {}), ...(mine ? { mine: "1" } : {}), page: String(n) })}`;
  return (
    <div className={styles.page} data-comp-directory="">
      <WorkspaceHeading
        glyph="composition"
        scene="comps"
        title={mine ? "My comps" : "Player comps"}
        accent="comps"
        description={
          mine
            ? "Comps you made, and the ones your Teams share with you."
            : "Comps players have shared, and the ones your Teams keep."
        }
        actions={
          <Link className="button primary" href="/compositions/new">
            Create a comp
          </Link>
        }
      >
        <CompTabs current={mine ? "mine" : "player"} />
      </WorkspaceHeading>
      <form className={`raised ${styles.filters}`} role="search" aria-label="Find comps">
        {mine && <input type="hidden" name="mine" value="1" />}
        <label>
          Search comp titles
          <span className={styles.searchWell}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={100}
              placeholder="Roads roam, Hellgate 5v5…"
            />
          </span>
        </label>
        <button className="button secondary" aria-label="Search comps">
          Search
        </button>
      </form>
      <section className={styles.section} aria-labelledby="player-comps">
        <SectionHeading
          id="player-comps"
          title={
            q ? (
              <>
                Matching <em>comps</em>
              </>
            ) : mine ? (
              <>
                Your <em>comps</em>
              </>
            ) : (
              <>
                Shared <em>comps</em>
              </>
            )
          }
          line={
            q
              ? `Titles with “${q}”.`
              : shown.length
                ? "Last updated first, five members per window."
                : undefined
          }
        />
        {shown.length ? (
          <ul className={styles.grid}>
            {shown.map((r) => {
              const { composition } = readStoredComposition(r);
              const players = composition.slots.length;
              const more = players - 5;
              return (
                <li key={r.id}>
                  <CompWindow
                    title={r.title}
                    href={`/compositions/${r.id}`}
                    chips={
                      <>
                        <span className="landing-chip">{r.contentType}</span>
                        <span className="landing-chip is-muted">{visibility[r.visibility]}</span>
                      </>
                    }
                    caption={`${players} ${players === 1 ? "player" : "players"} · by ${r.author.name || "Adventurer"}${more > 0 ? ` · +${more} more` : ""}`}
                  >
                    {players ? (
                      <RosterRows
                        members={composition.slots.map((slot) => slotRosterMember(slot))}
                        label={`${r.title} roster`}
                      />
                    ) : (
                      <p className={styles.memberNote}>Roster unavailable.</p>
                    )}
                  </CompWindow>
                </li>
              );
            })}
          </ul>
        ) : q ? (
          <EmptyWell
            emblem="team-comps"
            title={`No comp title matches “${q}”`}
            line="Check the spelling, or clear the search to see every comp."
            action={
              <Link
                className="button secondary"
                href={mine ? "/compositions?mine=1" : "/compositions"}
              >
                Clear search
              </Link>
            }
          />
        ) : mine ? (
          <EmptyWell
            emblem="team-comps"
            title={userId ? "No comps of your own yet" : "Sign in to see your comps"}
            line={
              userId
                ? "Comps you create, or that a Team shares with you, show up here."
                : "Comps you save, and the ones your Teams share, show up here once you sign in."
            }
            action={
              <Link
                className="button secondary"
                href={
                  userId ? "/compositions/new" : "/signin?callbackUrl=%2Fcompositions%3Fmine%3D1"
                }
              >
                {userId ? "Create a comp" : "Sign in"}
              </Link>
            }
          />
        ) : (
          <EmptyWell
            emblem="team-comps"
            title="No player has shared a comp yet"
            line={`Start from one of the ${(await libraryCounts()).compositions.toLocaleString()} Group Builds, or plan your own and share it.`}
            action={
              <Link className="button secondary" href="/compositions/library">
                Browse Group Builds
              </Link>
            }
          />
        )}
        <CompPages page={page} next={rows.length > 24} href={href} label="Comp pages" />
      </section>
      <CompNextSteps
        show={["library", "create", "teams"]}
        title={
          <>
            Get your party <em>ready</em>
          </>
        }
        line="Borrow a recorded comp, plan your own, or share one with your guild."
      />
    </div>
  );
}
