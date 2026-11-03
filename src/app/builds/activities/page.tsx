import { ArrowUpRight } from "lucide-react";
import { ActivityArtworkCard } from "@/components/activity-artwork-card";
import { BuildDiscoveryHeader } from "@/components/build-discovery-header";
import Link from "@/components/build-region-link";
import { activityBackgrounds } from "@/lib/activity-backgrounds";
import { buildDiscovery } from "@/lib/build-discovery";
import styles from "./page.module.css";

export const metadata = { title: "Builds by activity" };
export default function Activities() {
  const counts = new Map(buildDiscovery.activities.map((a) => [a.id, a]));
  return (
    <div className="builds-ecosystem">
      <BuildDiscoveryHeader
        active="activities"
        title="Choose your activity"
        description="From your next solo run to the next guild fight. Find a loadout for the way you play."
      />
      <section aria-label="Build activities">
        <div className={styles.intro}>
          <h2>Where are you headed?</h2>
          <Link href="/builds/library" className="text-link">
            Browse all builds <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.grid}>
          {activityBackgrounds.map((a) => (
            <ActivityArtworkCard
              key={a.id}
              category={a.id}
              name={a.name}
              builds={counts.get(a.id)?.count || 0}
              weapons={counts.get(a.id)?.topWeapons}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
