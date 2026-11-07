import type { CSSProperties } from "react";
import { Clock } from "lucide-react";
import Link from "@/components/link";
import { ItemIcon } from "@/components/item-icon";
import type { GuideCover } from "@/components/guide-cover-card";
import { smallestVariant, variantSrcSet } from "@/lib/image-variants";
import styles from "./guides-feature.module.css";

export type GuideSlide = GuideCover;

/** The cover again, blurred under it: art with a transparent edge (the activity cut-outs) still
 * fills the card instead of letting the dark card show through. It is blurred, so the narrowest
 * file serves it. */
export const coverBackdrop = (src: string) =>
  ({ "--cover": `url("${smallestVariant(src)}")` }) as CSSProperties;

/** The width a story's cover is drawn at: its box (the lead is 380px tall on phones and 460px
 * beside the side stories, which are 220px), or more where `object-fit: cover` crops a wide
 * cover to the box's height. */
function coverSizes(lead: boolean, cover: { width: number; height: number }) {
  const tall = (height: number) => `${Math.ceil((height * cover.width) / cover.height)}px`;
  return lead
    ? `(max-width: 700px) max(calc(100vw - 32px), ${tall(380)}), max(min(53vw, 653px), ${tall(460)})`
    : `(max-width: 700px) max(calc(100vw - 32px), ${tall(220)}), max(min(44vw, 503px), ${tall(220)})`;
}

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
            <span
              className={styles.art}
              aria-hidden="true"
              style={guide.cover ? coverBackdrop(guide.cover.src) : undefined}
            >
              {guide.cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- static cover with its own srcset
                <img
                  src={guide.cover.src}
                  srcSet={variantSrcSet(guide.cover.src)}
                  sizes={coverSizes(index === 0, guide.cover)}
                  width={guide.cover.width}
                  height={guide.cover.height}
                  alt=""
                  loading="lazy"
                  decoding="async"
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
