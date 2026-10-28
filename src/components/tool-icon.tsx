/** Original Outpost task glyphs. Decorative icons always accompany a text label. */
const paths = {
  fish: ["M3 12c4-8 11-8 16 0-5 8-12 8-16 0Z", "m19 12 3-4v8l-3-4M8 10h.01M12 6l2-3 3 5"],
  market: ["M3 20h18M5 17v-5h3v5m3 0V8h3v9m3 0V4h3v13", "m4 8 5-4 4 2 7-4"],
  trade: ["M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"],
  craft: ["m5 3 5 5-3 3-5-5m6 4 11 11 3-3L11 7M14 5l4-3 4 4-3 4m-2-3L3 21"],
  refine: ["M3 6h18l-4 5h-5v4h5v4H5v-4h4v-4H6L3 6Z", "M14 2v4m4-4v4"],
  farm: ["M12 22v-8M12 14C4 14 3 8 3 5c6 0 9 3 9 9Z", "M12 11C12 5 15 2 21 2c0 6-3 9-9 9Z"],
  enchant: ["m12 2 8 10-8 10L4 12 12 2Z", "m12 7 4 5-4 5-4-5 4-5Z"],
  transport: ["m3 7 9-4 9 4v11l-9 4-9-4V7Z", "m3 0 9 4 9-4M12 11v11M8 5l9 4v5"],
  history: ["M5 6a9 9 0 1 1-2 8M3 3v5h5", "M12 7v5l4 2"],
  equipment: [
    "m4 2 14 14m2-14L6 16M2 2l2 7 5-5-7-2Zm20 0-2 7-5-5 7-2ZM3 15l6 6m6-6 6 6M5 19l-3 3m17-3 3 3",
  ],
  composition: [
    "M9 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM7 21v-4a5 5 0 0 1 10 0v4M3 11a2 2 0 1 0 0-4m18 4a2 2 0 1 1 0-4M2 15v5m20-5v5",
  ],
  catalog: [
    "M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-2-1-6-2-10 1Zm0 0v15",
    "M5 8h4m-4 4h4m6-4h4m-4 4h4",
  ],
  guild: ["M5 3h14v11l-7 8-7-8V3ZM12 3v19M5 9h14", "m8 13 4-4 4 4-4 4-4-4Z"],
  builds: ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
  timer: ["M5 3h14M5 21h14M7 3v5l5 4-5 4v5m10-18v5l-5 4 5 4v5", "M10 6h4m-4 12h4"],
};
export function ToolIcon({ name, size = 22 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg
      className={`task-glyph task-glyph-${name}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
