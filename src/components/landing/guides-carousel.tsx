"use client";
import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GuideCoverCard, type GuideCover } from "@/components/guide-cover-card";

export type GuideSlide = GuideCover;

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
          <GuideCoverCard key={g.slug} guide={g} suffix={suffix} />
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
