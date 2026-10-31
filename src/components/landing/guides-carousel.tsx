"use client";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "@/components/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

export type GuideSlide = {
  slug: string;
  title: string;
  category: string;
  author: string;
  updatedAt: string;
  summary: string;
  minutes: number;
  cover: { src: string; width: number; height: number } | null;
};

/**
 * Guides as a sliding row: three at a time on desktop, arrows page through the rest, a swipe
 * on phones. Reading time is computed from each guide's own text by the page.
 */
export function GuidesCarousel({ guides, suffix }: { guides: GuideSlide[]; suffix: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: guides.length <= 3 });
  const update = () => {
    const t = track.current;
    if (!t) return;
    setEdge({ start: t.scrollLeft <= 4, end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 4 });
  };
  useEffect(() => {
    const id = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", update);
    };
  }, []);
  const page = (dir: 1 | -1) => {
    const t = track.current;
    if (!t) return;
    t.scrollBy({ left: dir * t.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="guides-carousel">
      <button
        type="button"
        className="guides-arrow is-prev"
        aria-label="Previous guides"
        disabled={edge.start}
        onClick={() => page(-1)}
      >
        <ChevronLeft size={22} />
      </button>
      <div className="guides-track" ref={track} onScroll={update}>
        {guides.map((g) => (
          <article key={g.slug} className="guide-card">
            <Link href={`/guides/${g.slug}${suffix}`}>
              {g.cover && (
                <Image
                  unoptimized
                  src={g.cover.src}
                  width={g.cover.width}
                  height={g.cover.height}
                  alt=""
                />
              )}
              <span className="guide-card-time">
                <Clock size={13} aria-hidden="true" />
                {g.minutes} min read
              </span>
              <span className="guide-card-copy">
                <small>{g.category}</small>
                <h3>{g.title}</h3>
                <span>{g.summary}</span>
                <em>
                  By {g.author} · Updated{" "}
                  {new Date(g.updatedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </em>
              </span>
            </Link>
          </article>
        ))}
      </div>
      <button
        type="button"
        className="guides-arrow is-next"
        aria-label="Next guides"
        disabled={edge.end}
        onClick={() => page(1)}
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
