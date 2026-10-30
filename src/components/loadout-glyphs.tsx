import type { SVGProps } from "react";

/**
 * Original line glyphs for the loadout board's empty slots, drawn to the same 24px grid and
 * stroke as the interface icons so an empty slot reads as "nothing recorded here" in the
 * game's own arrangement. Nothing here is taken from the game client.
 */
const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const slotGlyphs = {
  Bag: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M6 9h12l1.2 10.2a1.5 1.5 0 0 1-1.5 1.8H6.3a1.5 1.5 0 0 1-1.5-1.8L6 9Z" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
      <path d="M8.5 13.5h7" />
    </svg>
  ),
  Helmet: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M5 13a7 7 0 0 1 14 0v5H5v-5Z" />
      <path d="M5 14h14" />
      <path d="M12 6v12" />
      <path d="M9 18v2.5M15 18v2.5" />
    </svg>
  ),
  Cape: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M8 4h8l1 3-2.5 14H9.5L7 7l1-3Z" />
      <path d="M8 4c1 2 7 2 8 0" />
      <path d="M12 7v13" />
    </svg>
  ),
  "Main hand": (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M19 5 9.5 14.5" />
      <path d="M19 5h-3l-7.5 7.5" />
      <path d="M7 12l5 5" />
      <path d="M6.5 14.5 4 17l3 3 2.5-2.5" />
      <path d="M14.5 9.5 19 5" />
    </svg>
  ),
  Chest: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M8 4 5 7v6l2 1v6h10v-6l2-1V7l-3-3-2 2h-4L8 4Z" />
      <path d="M10 6c.5 1.5 3.5 1.5 4 0" />
      <path d="M12 8v12" />
    </svg>
  ),
  "Off hand": (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />
      <path d="M12 3v18M5 11h14" />
    </svg>
  ),
  Potion: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M10 3h4M10.5 3v5L6.5 15a4.5 4.5 0 0 0 4 6.5h3a4.5 4.5 0 0 0 4-6.5L13.5 8V3" />
      <path d="M7.5 15.5h9" />
    </svg>
  ),
  Boots: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M8 3h6v9l5 4v3H6v-5l2-2V3Z" />
      <path d="M8 7h6M6 19h13" />
    </svg>
  ),
  Food: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M4 12h16a8 8 0 0 1-16 0Z" />
      <path d="M8 9c0-2 2-2 2-4M12 9c0-2 2-2 2-4" />
      <path d="M6 18h12" />
    </svg>
  ),
  Mount: (p: SVGProps<SVGSVGElement>) => (
    <svg {...base} {...p}>
      <path d="M5 20v-6a7 7 0 0 1 7-7h1l2-3 3 1-1 3v2a4 4 0 0 1-4 4h-1v6" />
      <path d="M12 7c-1 0-2 .5-3 1.5" />
      <path d="M16.5 8.5h.01" />
      <path d="M8 14l-1 6" />
    </svg>
  ),
} as const;

export type BoardSlot = keyof typeof slotGlyphs;

/** Front-facing figure behind the board, like the game's inventory panel. */
export function LoadoutSilhouette(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 300" fill="currentColor" aria-hidden="true" {...props}>
      <ellipse cx="60" cy="28" rx="16" ry="20" />
      <path d="M44 52h32c10 0 16 6 20 14l12 44c2 8-1 14-7 16-5 2-10-1-12-7l-7-26v64l6 100c1 8-3 12-9 12h-6c-5 0-8-4-9-10l-7-78-2 0-7 78c-1 6-4 10-9 10h-6c-6 0-10-4-9-12l6-100V93l-7 26c-2 6-7 9-12 7-6-2-9-8-7-16l12-44c4-8 10-14 20-14Z" />
    </svg>
  );
}
