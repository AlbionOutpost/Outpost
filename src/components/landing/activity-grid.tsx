import { Heart } from "lucide-react";
import Link from "@/components/link";
import { ItemIcon } from "@/components/item-icon";

export type Activity = {
  category: string;
  name: string;
  builds: number;
  weapons: string[];
  top: { title: string; slug: string; upvotes: number } | null;
};

/**
 * Builds by what you are about to do: each activity with how many public builds it has, the
 * weapons its best-liked builds use and the single most liked build. Counts and likes come
 * from the public library as recorded.
 */
export function ActivityGrid({ activities, suffix }: { activities: Activity[]; suffix: string }) {
  const n = (value: number) => value.toLocaleString("en-US");
  const join = suffix ? `&${suffix.slice(1)}` : "";
  return (
    <ul className="activity-grid">
      {activities.map((a) => (
        <li key={a.category}>
          <Link
            className="raised activity-card"
            href={`/builds/library?category=${encodeURIComponent(a.category)}${join}`}
          >
            <span className="activity-weapons" aria-hidden="true">
              {a.weapons.map((id) => (
                <ItemIcon key={id} id={id} size={56} />
              ))}
            </span>
            <span className="activity-copy">
              <strong>{a.name}</strong>
              <small>{n(a.builds)} builds</small>
            </span>
            {a.top ? (
              <span className="activity-top">
                <span>Most liked</span>
                <em>{a.top.title}</em>
                <b>
                  <Heart size={12} aria-hidden="true" /> {n(a.top.upvotes)}
                </b>
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
