"use client";
import { useEffect } from "react";

const targets =
  ".landing-section-heading, .landing-card, .guides-carousel, .kill-card, .activity-grid > li, .plan-card";

/**
 * Marks landing sections as revealed the first time they come into view, so they rise into
 * place once and finish (see homepage.css). Without JavaScript, or with reduced motion,
 * nothing is hidden; content that loads later (the kill cards) is picked up as it appears.
 */
export function LandingReveal() {
  useEffect(() => {
    const root = document.querySelector(".home-landing");
    if (!root || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const watch = () => {
      for (const el of root.querySelectorAll(targets)) {
        if (seen.has(el)) continue;
        seen.add(el);
        // Already on screen when first seen: show it as it is, no jump.
        const box = el.getBoundingClientRect();
        if (box.top < innerHeight && box.bottom > 0) el.classList.add("is-revealed");
        else observer.observe(el);
      }
    };
    watch();
    root.classList.add("reveal-ready");
    const mutations = new MutationObserver(watch);
    mutations.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);
  return null;
}
