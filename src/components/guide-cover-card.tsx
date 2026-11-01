import Image from "next/image";
import { Clock } from "lucide-react";
import Link from "@/components/link";
import { ItemIcon } from "./item-icon";
import type { GuideNode } from "@/lib/grind-library-types";

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

/** A guide as a cover card: the artwork fills it, the reading time sits in the corner. */
export function GuideCoverCard({
  guide,
  suffix = "",
  className = "",
}: {
  guide: GuideCover;
  suffix?: string;
  className?: string;
}) {
  return (
    <article className={`guide-card${className ? ` ${className}` : ""}`}>
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
        <span className="guide-card-time">
          <Clock size={13} aria-hidden="true" />
          {guide.minutes} min read
        </span>
        <span className="guide-card-copy">
          <small>{guide.category}</small>
          <h3>{guide.title}</h3>
          <span>{guide.summary}</span>
          <em>
            By {guide.author} · Updated{" "}
            {new Date(guide.updatedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </em>
        </span>
      </Link>
    </article>
  );
}
