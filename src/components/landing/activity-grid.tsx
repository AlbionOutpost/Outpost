import { ArrowUpRight, Heart } from "lucide-react";
import Link from "@/components/link";
import { ItemIcon } from "@/components/item-icon";
import type { Activity } from "@/lib/library-activities";

/**
 * Builds by what you are about to do: each activity with its listed build count and its five
 * most liked builds, each opening that build. The heading opens the activity in the library.
 * Counts and likes come from the public library as recorded.
 */
export function ActivityGrid({ activities, suffix }: { activities: Activity[]; suffix: string }) {
  const n = (value: number) => value.toLocaleString("en-US");
  const join = suffix ? `&${suffix.slice(1)}` : "";
  return (
    <ul className="activity-grid">
      {activities.map((a) => (
        <li key={a.category}>
          <article className="raised has-scene activity-card" data-scene={sceneFor(a.category)}>
            <Link
              className="activity-head"
              href={`/builds/library?category=${encodeURIComponent(a.category)}${join}`}
            >
              <span>
                <strong>{a.name}</strong>
                <small>{n(a.builds)} builds</small>
              </span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            {a.top.length ? (
              <ol className="activity-builds" aria-label={`Most liked ${a.name} builds`}>
                {a.top.map((b) => (
                  <li key={b.slug}>
                    <Link href={`/builds/library/${encodeURIComponent(b.slug)}${suffix}`}>
                      {b.itemId ? <ItemIcon id={b.itemId} size={36} /> : <span />}
                      <span className="activity-build-title">{b.title}</span>
                      <b>
                        <Heart size={12} aria-hidden="true" /> {n(b.upvotes)}
                      </b>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="activity-empty">No liked builds yet.</p>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}

/** A painting that fits the activity: battles for group fights, the city for PvE and solo. */
function sceneFor(category: string) {
  if (/ZVZ|SMALL_SCALE|GANK|HELLGATE|CRYSTAL|ABYSSAL/.test(category)) return "composition";
  if (/MISTS|CORRUPTED|SOLO/.test(category)) return "build";
  return "city";
}
