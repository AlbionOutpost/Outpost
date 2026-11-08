import { getServerSession } from "next-auth";
import { ActivityArtworkCard } from "@/components/activity-artwork-card";
import { CompDirectoryHeader } from "@/components/comp-directory-header";
import Link from "@/components/build-region-link";
import { EmptyWell } from "@/components/empty-well";
import { activityBackgrounds } from "@/lib/activity-backgrounds";
import { libraryCompositionCounts } from "@/lib/grind-library";
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
 * pairing the comps list filters by, so a card's count is what its list shows).
 */
export default async function CompActivities() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const counts = new Map<string, number>();
  const add = (activity: string, n: number) =>
    counts.set(activity, (counts.get(activity) ?? 0) + n);
  for (const [category, n] of Object.entries(await libraryCompositionCounts())) add(category, n);
  const players = await db.composition.groupBy({
    by: ["contentType"],
    where: {
      hiddenAt: null,
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
    _count: { _all: true },
  });
  // Only content types the list can filter by count: a free-text type has no list to open.
  for (const row of players)
    if (playerContent(row.contentType)) add(activityForContent(row.contentType), row._count._all);
  const painted = new Set<string>(activityBackgrounds.map((a) => a.id));
  const listed = activityBackgrounds
    .map((a) => ({ ...a, comps: counts.get(a.id) ?? 0 }))
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
      <section aria-label="Comp activities" className={styles.sections}>
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
          {listed.map((a) => (
            <li key={a.id}>
              <ActivityArtworkCard
                category={a.id}
                name={a.name}
                builds={a.comps}
                noun={["comp", "comps"]}
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
