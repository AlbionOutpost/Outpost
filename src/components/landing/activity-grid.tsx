import { ActivityArtworkCard } from "@/components/activity-artwork-card";
import { buildDiscovery } from "@/lib/build-discovery";
import type { Activity } from "@/lib/library-activities";

/** Owner-supplied activity scenes and truthful listed build counts. */
export function ActivityGrid({ activities }: { activities: Activity[] }) {
  return (
    <ul className="activity-grid">
      {activities.map((a) => (
        <li key={a.category}>
          <ActivityArtworkCard
            category={a.category}
            name={a.name}
            builds={a.builds}
            weapons={buildDiscovery.activities.find((entry) => entry.id === a.category)?.topWeapons}
            compact
          />
        </li>
      ))}
    </ul>
  );
}
