import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/build-region-link";
import { activityBackgrounds } from "@/lib/activity-backgrounds";
import activityOutlines from "@/lib/activity-outlines.json";
import { ItemIcon } from "@/components/item-icon";
import styles from "./activity-artwork-card.module.css";

export function ActivityArtworkCard({
  category,
  name,
  builds,
  compact = false,
  weapons = [],
}: {
  category: string;
  name: string;
  builds: number;
  compact?: boolean;
  weapons?: { itemId: string; name: string }[];
}) {
  const art = activityBackgrounds.find((a) => a.id === category);
  return (
    <article
      className={`activity-artwork-card ${styles.card} ${compact ? styles.compact : ""}`}
      data-activity={category}
    >
      <Link
        className={`activity-artwork-link ${styles.main}`}
        href={`/builds/library?category=${encodeURIComponent(category)}`}
        prefetch={false}
        style={
          art ? ({ "--activity-outline": activityOutlines[art.id] } as CSSProperties) : undefined
        }
      >
        {art && (
          <Image
            className={styles.scene}
            data-activity-scene="true"
            src={art.src}
            alt=""
            fill
            sizes="(max-width: 599px) 100vw, (max-width: 899px) 50vw, (max-width: 1199px) 33vw, 380px"
          />
        )}
        <span className={styles.blur} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className={styles.border} aria-hidden="true" />
        <div className={styles.caption}>
          <div>
            {weapons.length > 0 && (
              <span
                className={styles.weapons}
                role="group"
                aria-label="Weapons from top category builds"
              >
                {weapons.slice(0, 3).map((weapon) => (
                  <span
                    key={weapon.itemId}
                    data-activity-weapon={weapon.itemId}
                    role="img"
                    aria-label={weapon.name}
                    title={weapon.name}
                  >
                    <ItemIcon id={weapon.itemId} size={48} />
                  </span>
                ))}
              </span>
            )}
            <h3>{name}</h3>
            <small>
              {builds
                ? `${builds.toLocaleString("en-US")} ${builds === 1 ? "build" : "builds"}`
                : "No builds listed yet"}
            </small>
          </div>
          <ArrowUpRight size={21} aria-hidden="true" />
        </div>
      </Link>
    </article>
  );
}
