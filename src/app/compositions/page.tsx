import { isCompList, metadataForPage, type SeoPageProps } from "@/lib/seo";
import CompActivities from "./comp-activities";
import { CompDirectoryHeader } from "@/components/comp-directory-header";
import { AdSlot } from "@/components/ad-slot";
import { findLibraryBuilds, queryLibraryCompositions } from "@/lib/grind-library";
import { activityName, type LibraryComposition } from "@/lib/grind-library-types";
import Link from "@/components/build-region-link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { readStoredComposition } from "@/lib/compositions/stored";
import { slotRosterMember } from "@/lib/compositions/roster";
import { CompRoster, RosterRows } from "@/components/comp-roster";
import { HeartChip } from "@/components/heart-chip";
import { CompGrid, CompWindow } from "@/components/comp-window";
import { Pagination } from "@/components/pagination";
import { EmptyWell } from "@/components/empty-well";
import { BuildSortSelect } from "@/components/build-sort-select";
import { SearchInput } from "@/components/field";
import { buildDiscovery } from "@/lib/build-discovery";
import {
  activityLabel,
  activityOptions,
  libraryActivity,
  playerContent,
  sliceOfPages,
  splitPage,
  type Source,
} from "@/lib/source-filter";
import styles from "@/components/comps.module.css";
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/compositions", await searchParams);
}
const visibility = { PUBLIC: "Public", PRIVATE: "Private", GROUP: "Team only" } as const;
const size = 24;
/**
 * `/compositions` opens on comps by activity, as Builds does; any list parameter (`view=all`,
 * a search, a filter or a page) opens the list. Every comp in one list: comps players made on Outpost (and the ones their Teams share) and
 * the recorded Group Builds. "All" shows the player comps first, then the Group Builds, each
 * under its own heading with its own count.
 */
export default async function Compositions({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    value = (key: string) => (typeof params[key] === "string" ? params[key].slice(0, 100) : "");
  if (!isCompList(params)) return <CompActivities />;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const mine = value("mine") === "1",
    source: Source = mine
      ? "player"
      : value("source") === "player" || value("source") === "library"
        ? (value("source") as Source)
        : "",
    requested = z.coerce.number().int().min(1).max(1000).catch(1).parse(value("page")),
    q = value("q").trim(),
    activity = value("category");
  const libraryCategory = activity ? libraryActivity(activity) : "",
    content = activity ? playerContent(activity) : "",
    libraryOpen = source !== "player" && libraryCategory !== null,
    playerOpen = source !== "library" && content !== null;
  const query = { source, mine: mine ? "1" : "", q, category: activity };
  const href = (patch: Record<string, string>) => {
    const next = new URLSearchParams({ ...query, ...patch });
    for (const [key, v] of [...next]) if (!v) next.delete(key);
    // With no filter left, the list still needs a parameter: bare `/compositions` is the grid.
    return `/compositions?${next.size ? next : "view=all"}`;
  };
  const reset = href({ q: "", category: "", page: "" });
  const where: Prisma.CompositionWhereInput = {
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
      ...(mine ? [{ authorId: userId || "__anonymous__" }] : []),
      ...(content ? [{ contentType: content }] : []),
      ...(q ? [{ title: { contains: q, mode: "insensitive" as const } }] : []),
    ],
  };
  const playerRows = (start: number, take: number) =>
    take > 0
      ? db.composition.findMany({
          where,
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          take,
          skip: start,
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
        })
      : Promise.resolve([]);
  const libraryPage = (page: number) =>
    queryLibraryCompositions({ q, category: libraryCategory || "", page });
  const [playerTotal, library] = await Promise.all([
    playerOpen ? db.composition.count({ where }) : 0,
    libraryOpen ? libraryPage(requested) : null,
  ]);
  const libraryTotal = library?.matched ?? 0;
  let page: number, pages: number, players, groupBuilds: LibraryComposition[];
  if (source === "library") {
    ({ page, pages } = library ?? { page: 1, pages: 1 });
    players = [] as Awaited<ReturnType<typeof playerRows>>;
    groupBuilds = library?.rows ?? [];
  } else if (source === "player") {
    pages = Math.max(1, Math.ceil(playerTotal / size));
    page = Math.min(requested, pages);
    players = await playerRows((page - 1) * size, size);
    groupBuilds = [];
  } else {
    // One page holds 24 comps: the players' first, then the Group Builds.
    const split = splitPage(requested, playerTotal, libraryTotal, size);
    ({ page, pages } = split);
    [players, groupBuilds] = await Promise.all([
      playerRows((page - 1) * size, split.playerTake),
      library ? sliceOfPages(libraryPage, split.libraryStart, split.libraryTake, 18, library) : [],
    ]);
  }
  const builds = await findLibraryBuilds([
    ...new Set(groupBuilds.flatMap((comp) => comp.members.slice(0, 5))),
  ]);
  const memberBuilds = new Map(builds.map((build) => [build.id, build]));
  const total = playerTotal + libraryTotal,
    shown = players.length + groupBuilds.length,
    first = source === "library" ? (page - 1) * 18 : (page - 1) * size;
  const options = activityOptions(
    source,
    buildDiscovery.activities.map((a) => a.id),
  );
  const noun = source === "library" ? "Group Build" : source === "player" ? "player comp" : "comp";
  const playerGrid = (
    <CompGrid>
      {players.map((r) => {
        const { composition } = readStoredComposition(r);
        const count = composition.slots.length;
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
              total={count}
              noun="player"
              byline={`By ${r.author.name || "Adventurer"}`}
            >
              {count ? (
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
    </CompGrid>
  );
  const libraryGrid = (
    <CompGrid>
      {groupBuilds.map((comp) => {
        const members = comp.members.flatMap((id) => {
          const b = memberBuilds.get(id);
          return b ? [b] : [];
        });
        return (
          <li key={comp.slug}>
            <CompWindow
              title={comp.title}
              href={`/compositions/library/${encodeURIComponent(comp.slug)}`}
              chips={
                <>
                  <span className="landing-chip">{activityName(comp.category)}</span>
                  {comp.upvotes != null && <HeartChip count={comp.upvotes} />}
                </>
              }
              total={comp.members.length}
              noun="member"
              byline={`By ${comp.author}`}
            >
              {members.length ? (
                <CompRoster members={members} linked={false} />
              ) : (
                <p className={styles.memberNote}>Member loadouts unavailable.</p>
              )}
            </CompWindow>
          </li>
        );
      })}
    </CompGrid>
  );
  const sources = [
    ["", "All", source === ""],
    ["player", "Player comps", source === "player"],
    ["library", "Group Builds", source === "library"],
  ] as const;
  return (
    <div className={styles.page} data-comp-directory="">
      <CompDirectoryHeader
        active={mine ? "mine" : "browse"}
        title={mine ? "My comps" : "Albion Online comps"}
        description={
          mine
            ? "Comps you made, and the ones your Teams share with you."
            : "Party comps players shared on Outpost, and Group Builds: recorded comps with every member’s loadout. Copy one to plan your own party around it."
        }
      />
      <div className={`raised ${styles.toolbar}`}>
        {!mine && (
          <nav className={`segmented ${styles.sources}`} aria-label="Comp source">
            {sources.map(([id, label, current]) => (
              <Link
                key={id}
                href={href({ source: id, page: "" })}
                aria-current={current ? "true" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
        <form
          className={`${styles.filters} ${styles.hasSelect}`}
          action="/compositions"
          role="search"
          aria-label="Find comps"
        >
          {source && <input type="hidden" name="source" value={source} />}
          {mine && <input type="hidden" name="mine" value="1" />}
          <label>
            <span className={styles.fieldName}>Search comps</span>
            <SearchInput
              type="search"
              name="q"
              defaultValue={q}
              maxLength={100}
              placeholder="Comp name…"
            />
          </label>
          <label>
            <span className={styles.fieldName}>Activity</span>
            <BuildSortSelect name="category" defaultValue={activity}>
              <option value="">All activities</option>
              {activity && !options.some((o) => o.value === activity) && (
                <option value={activity}>{activityLabel(activity)}</option>
              )}
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </BuildSortSelect>
          </label>
          <button className="button secondary">Find comps</button>
        </form>
      </div>
      <section className={styles.section} aria-label="Matching comps">
        <p className={styles.count} aria-live="polite" aria-atomic="true">
          <strong>{total.toLocaleString("en-GB")}</strong>{" "}
          {mine ? "of your comps" : total === 1 ? noun : `${noun}s`}
          {[
            source === "" &&
              ` (${playerTotal.toLocaleString("en-GB")} from players · ${libraryTotal.toLocaleString("en-GB")} Group Builds)`,
            shown > 0 && ` · ${first + 1}–${first + shown} shown`,
            source === "library"
              ? " · Most liked first"
              : source === "player"
                ? " · Last updated first"
                : "",
          ]
            .filter(Boolean)
            .join("")}
        </p>
        {source === "" && players.length > 0 && groupBuilds.length > 0 ? (
          <>
            <section className={styles.sourceGroup} aria-labelledby="player-comps">
              <h2 id="player-comps">Player comps</h2>
              {playerGrid}
            </section>
            <section className={styles.sourceGroup} aria-labelledby="group-builds">
              <h2 id="group-builds">Group Builds</h2>
              {libraryGrid}
            </section>
          </>
        ) : (
          <>
            {players.length > 0 && playerGrid}
            {groupBuilds.length > 0 && libraryGrid}
          </>
        )}
        {!shown &&
          (q || activity ? (
            <EmptyWell
              emblem="team-comps"
              title={q ? `No comp matches “${q}”` : "No comp matches those filters"}
              line="Check the spelling, try another activity, or clear the filters."
              action={
                <Link className="button secondary" href={reset}>
                  Clear filters
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
              line="Start from a recorded Group Build, or plan your own and share it."
              action={
                <Link className="button secondary" href="/compositions?source=library">
                  Browse Group Builds
                </Link>
              }
            />
          ))}
        <Pagination
          page={page}
          pages={pages}
          href={(n) => href({ page: String(n) })}
          label="Comp pages"
        />
      </section>
      {groupBuilds.length > 0 && <AdSlot placement="hub" />}
    </div>
  );
}
