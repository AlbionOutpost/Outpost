import Image from "next/image";
import { Clock } from "lucide-react";
import Link from "@/components/link";
import { ItemIcon } from "./item-icon";
import type { GuideNode } from "@/lib/grind-library-types";
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

/** A guide as a cover card, like the landing's side stories: the artwork fills it, topic and
 * reading time sit in the corner, the title and two lines of summary on a scrim at the foot. */
export function GuideCoverCard({
  guide,
  suffix = "",
  className = "",
}: {
  guide: GuideCover;
  suffix?: string;
  className?: string;
}) {
  const date = guideDate(guide.updatedAt);
  return (
    <article className={`guide-card ${styles.card}${className ? ` ${className}` : ""}`}>
      <Link href={`/guides/${guide.slug}${suffix}`}>
        {guide.cover ? (
          <Image
            unoptimized
            src={guide.cover.src}
            width={guide.cover.width}
            height={guide.cover.height}
            alt=""
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
