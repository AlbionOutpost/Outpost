import { Clock } from "lucide-react";
import Link from "@/components/link";
import { ItemIcon } from "./item-icon";
import type { GuideNode } from "@/lib/grind-library-types";
import { coverBackdrop } from "./landing/guides-carousel";
import { variantSrcSet } from "@/lib/image-variants";
import styles from "./guide-cover-card.module.css";

export type GuideCover = {
  slug: string;
  title: string;
  category: string;
  author: string;
  updatedAt: string;
  summary: string;
  minutes: number;
  cover: { src: string; width: number; height: number } | null;
  /** An item that stands for the guide when it has no cover. */
  itemId?: string;
};

/** Words in a guide's own text, for its reading time at 230 words a minute. */
export function guideWords(nodes: GuideNode[]): number {
  let n = 0;
  for (const node of nodes) {
    if (typeof node === "string") n += node.split(/\s+/).filter(Boolean).length;
    else n += guideWords(node.children ?? []);
  }
  return n;
}
export const readingMinutes = (nodes: GuideNode[]) =>
  Math.max(1, Math.round(guideWords(nodes) / 230));

/** "26 Oct 2026", or null when the source gave no usable date. */
export function guideDate(value: string) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;
}

/** The width a card's cover is drawn at in the guides grid (one column on phones, then two,
 * three and four), or more where `object-fit: cover` crops a wide cover to the card's height
 * (280px on phones, 340px above). */
function coverSizes({ width, height }: { width: number; height: number }) {
  const tall = (h: number) => `${Math.ceil((h * width) / height)}px`;
  return `(max-width: 700px) max(calc(100vw - 24px), ${tall(280)}), (max-width: 1100px) max(46vw, ${tall(340)}), max(min(33vw, 420px), ${tall(340)})`;
}

/** A guide as a cover card, like the landing's side stories: the artwork fills it, topic and
 * reading time sit in the corner, the title and two lines of summary on a scrim at the foot. */
export function GuideCoverCard({
  guide,
  suffix = "",
  className = "",
  priority = false,
}: {
  guide: GuideCover;
  suffix?: string;
  className?: string;
  /** The first card in a grid is the page's largest paint: load its cover at once. */
  priority?: boolean;
}) {
  const date = guideDate(guide.updatedAt);
  return (
    <article className={`guide-card ${styles.card}${className ? ` ${className}` : ""}`}>
      <Link
        href={`/guides/${guide.slug}${suffix}`}
        style={guide.cover ? coverBackdrop(guide.cover.src) : undefined}
      >
        {guide.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- static cover with its own srcset
          <img
            src={guide.cover.src}
            srcSet={variantSrcSet(guide.cover.src)}
            sizes={coverSizes(guide.cover)}
            width={guide.cover.width}
            height={guide.cover.height}
            alt=""
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
          />
        ) : (
          <span className="guide-card-stand" aria-hidden="true">
            <ItemIcon id={guide.itemId || "T4_BAG"} size={96} />
          </span>
        )}
        <span className={styles.meta}>
          <span className={styles.category}>{guide.category}</span>
          <span className={styles.time}>
            <Clock size={13} aria-hidden="true" />
            {guide.minutes} min read
          </span>
        </span>
        <span className={`guide-card-copy ${styles.copy}`}>
          <h3 title={guide.title}>{guide.title}</h3>
          <span>{guide.summary}</span>
          <em>
            By {guide.author}
            {date ? ` · Updated ${date}` : ""}
          </em>
        </span>
      </Link>
    </article>
  );
}
