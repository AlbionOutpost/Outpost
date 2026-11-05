import { ActivityArtworkCard } from "@/components/activity-artwork-card";
import { buildDiscovery } from "@/lib/build-discovery";
import type { Activity } from "@/lib/library-activities";

/** The card width in `.activity-grid` (homepage.css): one column under 361px, two to 1100px
 * (16px or 32px gutters, 22px gap), then three across the landing width. */
const sizes =
  "(max-width: 360px) calc(100vw - 32px), (max-width: 700px) calc(50vw - 27px), (max-width: 1100px) calc(50vw - 43px), 380px";

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
            sizes={sizes}
          />
        </li>
      ))}
    </ul>
  );
}
