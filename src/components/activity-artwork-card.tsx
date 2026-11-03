import Image from "next/image";
import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/build-region-link";
import { activityBackgrounds } from "@/lib/activity-backgrounds";
import activityOutlines from "@/lib/activity-outlines.json";
import styles from "./activity-artwork-card.module.css";

export function ActivityArtworkCard({
  category,
  name,
  builds,
  compact = false,
}: {
  category: string;
  name: string;
  builds: number;
  compact?: boolean;
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
        <div className={styles.caption}>
          <div>
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
