"use client";
import { useEffect, useRef, useState } from "react";
import styles from "@/app/guides/[slug]/article.module.css";

/**
 * The guide reader's moving parts: a reading progress bar along the top of the window, the
 * contents list with the section in view marked by a sliding ember bar, and sections that rise
 * into place the first time they scroll in. Server-rendered links work without it; with reduced
 * motion the bar and the marker still update but nothing slides or rises.
 */
export function GuideReader({ toc }: { toc: { id: string; title: string }[] }) {
  const [active, setActive] = useState(toc[0]?.id);
  const [marker, setMarker] = useState<{ y: number; h: number } | null>(null);
  const nav = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  // Progress through the article, and which heading was passed last.
  useEffect(() => {
    const article = document.querySelector<HTMLElement>("[data-guide-article]");
    if (!article) return;
    const headings = toc
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => !!el);
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = article.getBoundingClientRect();
      const span = Math.max(1, box.height - innerHeight * 0.6);
      const progress = Math.min(1, Math.max(0, (innerHeight * 0.25 - box.top) / span));
      bar.current?.style.setProperty("--progress", progress.toFixed(4));
      let current = headings[0]?.id;
      for (const heading of headings)
        if (heading.getBoundingClientRect().top < innerHeight * 0.3) current = heading.id;
      setActive(current);
    };
    const schedule = () => (frame ||= requestAnimationFrame(update));
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, [toc]);

  // The marker follows the active link (measured, so wrapped titles get a taller bar).
  useEffect(() => {
    const link = nav.current?.querySelector<HTMLElement>(`a[href="#${active}"]`);
    if (link) setMarker({ y: link.offsetTop, h: link.offsetHeight });
  }, [active]);

  // Sections rise into place once, the first time they come into view.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sections = document.querySelectorAll<HTMLElement>("[data-guide-section]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    for (const section of sections) {
      const box = section.getBoundingClientRect();
      // Already on screen (or above it, after a jump to an anchor): show it as it is.
      if (box.top < innerHeight) section.setAttribute("data-revealed", "");
      else {
        section.setAttribute("data-reveal", "");
        observer.observe(section);
      }
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className={styles.progress} ref={bar} aria-hidden="true" />
      <nav className={styles.contents} aria-label="Guide contents" ref={nav}>
        {marker && (
          <span
            className={styles.marker}
            style={{ transform: `translateY(${marker.y}px)`, height: marker.h }}
            aria-hidden="true"
          />
        )}
        {toc.map((item) => (
          <a
            href={`#${item.id}`}
            key={item.id}
            aria-current={item.id === active ? "location" : undefined}
          >
            {item.title}
          </a>
        ))}
      </nav>
    </>
  );
}
