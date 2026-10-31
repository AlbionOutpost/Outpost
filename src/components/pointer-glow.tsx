"use client";
import { useEffect } from "react";

const cards =
  "a.raised, .raised.is-link, .landing-window, .landing-card, .kill-card, .activity-card";

/**
 * Feeds the pointer position to the card under it (`--mx`, `--my` in the card's own
 * unscaled pixels) so its ember light follows the cursor. One passive listener for the whole
 * page, at most one style write per frame; nothing runs on touch screens.
 */
export function PointerGlow() {
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const event = last;
      const card =
        event?.target instanceof Element ? event.target.closest<HTMLElement>(cards) : null;
      if (!event || !card) return;
      const box = card.getBoundingClientRect();
      const scale = box.width ? card.offsetWidth / box.width : 1;
      card.style.setProperty("--mx", `${Math.round((event.clientX - box.left) * scale)}px`);
      card.style.setProperty("--my", `${Math.round((event.clientY - box.top) * scale)}px`);
    };
    const move = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => {
      document.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
