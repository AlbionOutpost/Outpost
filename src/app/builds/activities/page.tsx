import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { ActivityArtworkCard } from "@/components/activity-artwork-card";
import { BuildDiscoveryHeader } from "@/components/build-discovery-header";
import { SectionHeading } from "@/components/section-heading";
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
        <li key={a.id} data-empty={a.builds ? undefined : "true"}>
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
        description="Pick the content you play and open the builds players use for it."
      />
      <section aria-label="Build activities" className={styles.sections}>
        <section aria-labelledby="activities-listed">
          <SectionHeading
            id="activities-listed"
            title={
              <>
                A build for <em>every</em> activity
              </>
            }
            line={`${total.toLocaleString("en-US")} builds across ${listed.length} activities. Each card opens the library on that content.`}
            link={{ href: "/builds/library", label: "All builds" }}
          />
          {grid(listed)}
        </section>
        {open.length > 0 && (
          <section aria-labelledby="activities-open">
            <SectionHeading
              id="activities-open"
              title={
                <>
                  No builds <em>yet</em>
                </>
              }
              line="Nobody has listed a build for these activities. Post the one you run."
              link={{ href: "/builds/new", label: "Create a build" }}
            />
            {grid(open)}
          </section>
        )}
      </section>
    </div>
  );
}
