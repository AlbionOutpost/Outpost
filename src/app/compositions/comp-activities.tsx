import { getServerSession } from "next-auth";
import { ActivityArtworkCard } from "@/components/activity-artwork-card";
import { CompDirectoryHeader } from "@/components/comp-directory-header";
import Link from "@/components/build-region-link";
import { EmptyWell } from "@/components/empty-well";
import { activityBackgrounds } from "@/lib/activity-backgrounds";
import { libraryCompositionCounts, libraryCompositionWeapons } from "@/lib/grind-library";
import { rankWeapons, type ActivityWeapon } from "@/lib/library-activities";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { activityForContent, activityLabel, playerContent } from "@/lib/source-filter";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import styles from "@/app/builds/activities/page.module.css";
import comps from "@/components/comps.module.css";

/** The card width in the shared activity grid (see builds/activities). */
const sizes =
  "(max-width: 360px) calc(100vw - 32px), (max-width: 700px) calc(50vw - 27px), (max-width: 1100px) calc(33vw - 30px), 300px";
const href = (activity: string) => `/compositions?category=${encodeURIComponent(activity)}`;

/**
 * Comps by activity, where `/compositions` opens, as Builds opens on its activities: one painted
 * card per activity that has comps, counting the recorded Group Builds and the player comps the viewer can open (the same activity
 * pairing the comps list filters by, so a card's count is what its list shows). Like the Builds
 * cards, each overlays three real weapons: the main hands its Group Builds' comps carry most
 * often, filled from the player comps the viewer can open when the Group Builds give fewer.
 */
export default async function CompActivities() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const visible = {
    hiddenAt: null,
    OR: [
      { visibility: "PUBLIC" as const },
      ...(userId
        ? [
            { authorId: userId, visibility: "PRIVATE" as const },
            { visibility: "GROUP" as const, group: { members: { some: { userId } } } },
          ]
        : []),
    ],
  };
  const counts = new Map<string, number>();
  const add = (activity: string, n: number) =>
    counts.set(activity, (counts.get(activity) ?? 0) + n);
  for (const [category, n] of Object.entries(await libraryCompositionCounts())) add(category, n);
  const players = await db.composition.groupBy({
    by: ["contentType"],
    where: visible,
    _count: { _all: true },
  });
  // Only content types the list can filter by count: a free-text type has no list to open.
  for (const row of players)
    if (playerContent(row.contentType)) add(activityForContent(row.contentType), row._count._all);
  const painted = new Set<string>(activityBackgrounds.map((a) => a.id));
  const weapons = new Map<string, ActivityWeapon[]>(
    Object.entries(await libraryCompositionWeapons()),
  );
  // Player comps fill only the painted activities still short of three weapons, one bounded read
  const short = players
    .map((row) => row.contentType)
    .filter((type) => {
      const activity = activityForContent(type);
      return painted.has(activity) && (weapons.get(activity)?.length ?? 0) < 3;
    });
  if (short.length) {
    const rows = await db.composition.findMany({
      where: { ...visible, contentType: { in: short } },
      select: { contentType: true, slots: true },
      orderBy: { updatedAt: "desc" },
      take: 60,
    });
    const found = new Map<string, Map<string, ActivityWeapon>>();
    for (const row of rows) {
      const activity = activityForContent(row.contentType);
      const tally = found.get(activity) ?? new Map<string, ActivityWeapon>();
      found.set(activity, tally);
      const mains = new Set(
        (Array.isArray(row.slots) ? row.slots : []).flatMap((slot) => {
          const equipment = (slot as { equipment?: { slot?: string; itemId?: string }[] })
            ?.equipment;
          const main = Array.isArray(equipment)
            ? equipment.find((e) => e?.slot === "Main hand")?.itemId
            : undefined;
          return typeof main === "string" && main ? [main] : [];
        }),
      );
      for (const itemId of mains)
        tally.set(itemId, {
          itemId,
          name: equipmentName(itemId),
          count: (tally.get(itemId)?.count ?? 0) + 1,
        });
    }
    for (const [activity, tally] of found) {
      const have = weapons.get(activity) ?? [];
      const extra = rankWeapons(
        [...tally.values()].filter((w) => !have.some((h) => h.itemId === w.itemId)),
        3,
      );
      weapons.set(activity, [...have, ...extra]);
    }
  }
  const listed = activityBackgrounds
    .map((a) => ({ ...a, comps: counts.get(a.id) ?? 0, weapons: weapons.get(a.id) ?? [] }))
    .filter((a) => a.comps > 0);
  // Player activities with no painting of their own (Ganking, Roaming…) as one quiet row
  const others = [...counts]
    .filter(([activity]) => !painted.has(activity))
    .sort(([a], [b]) => a.localeCompare(b));
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  return (
    <div className={comps.page}>
      <CompDirectoryHeader
        active="activities"
        title="Comps by activity"
        description={`${total.toLocaleString("en-US")} comps across ${listed.length + others.length} activities. Open one to see the parties players run there.`}
      />
      <section aria-labelledby="comp-activities-title" className={styles.sections}>
        <h2 id="comp-activities-title" className="sr-only">
          Comp activities
        </h2>
        {!total && (
          <EmptyWell
            emblem="team-comps"
            title="No comps yet"
            line="Plan your party and share it, and it shows up under its activity."
            action={
              <Link className="button secondary" href="/compositions/new">
                Create a comp
              </Link>
            }
          />
        )}
        <ul className={styles.grid}>
          {listed.map((a, i) => (
            <li key={a.id}>
              <ActivityArtworkCard
                priority={i < 4}
                category={a.id}
                name={a.name}
                builds={a.comps}
                noun={["comp", "comps"]}
                weapons={a.weapons.slice(0, 3)}
                href={href(a.id)}
                compact
                sizes={sizes}
              />
            </li>
          ))}
        </ul>
        {others.length > 0 && (
          <section className={`well ${styles.open}`} aria-labelledby="comp-activities-other">
            <p id="comp-activities-other" className={styles.openTitle}>
              More activities
            </p>
            <ul className={styles.openList}>
              {others.map(([activity, n]) => (
                <li key={activity}>
                  <Link className="landing-chip" href={href(activity)} prefetch={false}>
                    {activityLabel(activity)} · {n.toLocaleString("en-US")}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </div>
  );
}
