import { Heart } from "lucide-react";
import Link from "@/components/link";
import { ActivityArtworkCard } from "@/components/activity-artwork-card";
import type { Activity } from "@/lib/library-activities";

/** Owner-supplied category scenes with the existing recorded counts and most-liked links. */
export function ActivityGrid({ activities, suffix }: { activities: Activity[]; suffix: string }) {
  const n = (value: number) => value.toLocaleString("en-US");
  return (
    <ul className="activity-grid">
      {activities.map((a) => {
        const best = a.top[0];
        return (
          <li key={a.category}>
            <ActivityArtworkCard category={a.category} name={a.name} builds={a.builds} compact>
              {best ? (
                <Link
                  className="activity-top"
                  href={`/builds/library/${encodeURIComponent(best.slug)}${suffix}`}
                >
                  <span>Most liked</span>
                  <em>{best.title}</em>
                  <b>
                    <Heart size={12} aria-hidden="true" /> {n(best.upvotes)}
                  </b>
                </Link>
              ) : (
                <p className="activity-top activity-empty">No liked builds yet.</p>
              )}
            </ActivityArtworkCard>
          </li>
        );
      })}
    </ul>
  );
}
