import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { ActivityArtworkCard } from "@/components/activity-artwork-card";
import { BuildDiscoveryHeader } from "@/components/build-discovery-header";
import { BuildsNextStep } from "@/components/builds-next-step";
import Link from "@/components/build-region-link";
import { ArrowRight } from "lucide-react";
import { activityBackgrounds } from "@/lib/activity-backgrounds";
import { buildDiscovery } from "@/lib/build-discovery";
import styles from "./page.module.css";

export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/builds/activities", await searchParams);
}

/** The card width in `.grid`: one column under 361px, two to 1100px, then three across. */
const sizes =
  "(max-width: 360px) calc(100vw - 32px), (max-width: 700px) calc(50vw - 27px), (max-width: 1100px) calc(50vw - 43px), 450px";

export default function Activities() {
  const counts = new Map(buildDiscovery.activities.map((a) => [a.id, a]));
  const activities = activityBackgrounds.map((a) => ({
    ...a,
    builds: counts.get(a.id)?.count || 0,
    weapons: counts.get(a.id)?.topWeapons,
  }));
  const listed = activities.filter((a) => a.builds > 0);
  const open = activities.filter((a) => a.builds === 0);
  const total = listed.reduce((sum, a) => sum + a.builds, 0);
  const grid = (items: typeof activities) => (
    <ul className={styles.grid}>
      {items.map((a) => (
        <li key={a.id}>
          <ActivityArtworkCard
            category={a.id}
            name={a.name}
            builds={a.builds}
            weapons={a.weapons}
            compact
            sizes={sizes}
          />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="builds-ecosystem builds-hub">
      <BuildDiscoveryHeader
        active="activities"
        title="Choose your activity"
        accent="activity"
        description={`${total.toLocaleString("en-US")} builds across ${listed.length} activities. Open one to see the loadouts players run there.`}
      />
      <section aria-label="Build activities" className={styles.sections}>
        {grid(listed)}
        {open.length > 0 && (
          <section className={`well ${styles.open}`} aria-labelledby="activities-open">
            <p id="activities-open" className={styles.openTitle}>
              No builds yet
            </p>
            <ul className={styles.openList}>
              {open.map((a) => (
                <li key={a.id}>
                  <Link
                    className="landing-chip"
                    href={`/builds/library?category=${encodeURIComponent(a.id)}`}
                    prefetch={false}
                  >
                    {a.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link className="pill-link is-small" href="/builds/new">
              Create a build <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </section>
        )}
      </section>
      <BuildsNextStep
        title={
          <>
            Not sure <em>where</em> to start?
          </>
        }
        line="Search the whole library by weapon or author, or build a loadout for the content you run."
        secondary={{ href: "/builds/library", label: "Build library" }}
      />
    </div>
  );
}
