import { Heart } from "lucide-react";
import Link from "@/components/link";
import { ItemIcon } from "@/components/item-icon";
import type { Activity } from "@/lib/library-activities";

/**
 * Builds by what you are about to do: each activity with its listed build count, the weapons
 * its best-liked builds use fanned like a hand of cards, and the single most liked build. The
 * card opens the activity in the library; the most liked line opens that build. Counts and
 * likes come from the public library as recorded.
 */
export function ActivityGrid({ activities, suffix }: { activities: Activity[]; suffix: string }) {
  const n = (value: number) => value.toLocaleString("en-US");
  const join = suffix ? `&${suffix.slice(1)}` : "";
  return (
    <ul className="activity-grid">
      {activities.map((a) => {
        const weapons = [...new Set(a.top.flatMap((b) => (b.itemId ? [b.itemId] : [])))].slice(
          0,
          3,
        );
        const best = a.top[0];
        return (
          <li key={a.category}>
            <article className="raised has-scene activity-card" data-scene={sceneFor(a.category)}>
              <span className="activity-weapons" aria-hidden="true">
                {weapons.map((id) => (
                  <ItemIcon key={id} id={id} size={56} />
                ))}
              </span>
              <Link
                className="activity-copy"
                href={`/builds/library?category=${encodeURIComponent(a.category)}${join}`}
              >
                <strong>{a.name}</strong>
                <small>{n(a.builds)} builds</small>
              </Link>
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
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/** A painting that fits the activity: battles for group fights, the city for PvE and solo. */
function sceneFor(category: string) {
  if (/ZVZ|SMALL_SCALE|GANK|HELLGATE|CRYSTAL|ABYSSAL/.test(category)) return "composition";
  if (/MISTS|CORRUPTED|SOLO/.test(category)) return "build";
  if (/AVALON/.test(category)) return "economy";
  return "city";
}
