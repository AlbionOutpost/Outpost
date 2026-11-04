import Image from "next/image";
import { Clock } from "lucide-react";
import Link from "@/components/link";
import { ItemIcon } from "@/components/item-icon";
import type { GuideCover } from "@/components/guide-cover-card";
import styles from "./guides-feature.module.css";

export type GuideSlide = GuideCover;

/** One lead story and two supporting reads; the full library remains one link away. */
export function GuidesCarousel({ guides, suffix }: { guides: GuideSlide[]; suffix: string }) {
  if (!guides.length) return null;
  return (
    <div className={`guides-carousel ${styles.grid}`}>
      {guides.slice(0, 3).map((guide, index) => (
        <article
          key={guide.slug}
          className={`${styles.story} ${index === 0 ? styles.lead : styles.side}`}
        >
          <Link href={`/guides/${guide.slug}${suffix}`} className={styles.link}>
            <span className={styles.art} aria-hidden="true">
              {guide.cover ? (
                <Image
                  unoptimized
                  src={guide.cover.src}
                  width={guide.cover.width}
                  height={guide.cover.height}
                  alt=""
                />
              ) : (
                <span className={styles.fallback}>
                  <ItemIcon id={guide.itemId || "T4_BAG"} size={96} />
                </span>
              )}
            </span>
            <span className={styles.meta}>
              <small className={styles.category}>{guide.category}</small>
              <span className={styles.readTime}>
                <Clock size={13} aria-hidden="true" />
                {guide.minutes} min read
              </span>
            </span>
            <span className={styles.copy}>
              <h3>{guide.title}</h3>
              {index === 0 && <span className={styles.summary}>{guide.summary}</span>}
            </span>
          </Link>
        </article>
      ))}
    </div>
  );
}
