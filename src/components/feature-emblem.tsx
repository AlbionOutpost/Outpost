type FeatureKind = "market" | "build" | "calculator" | "guild";

/** Outpost's own navigation emblems. These are interface symbols, not game item art. */
export function FeatureEmblem({ kind }: { kind: FeatureKind }) {
  return (
    <svg
      className={`feature-emblem feature-emblem-${kind}`}
      viewBox="0 0 72 80"
      fill="none"
      aria-hidden="true"
    >
      <path className="emblem-field" d="M8 8h56v41c0 13-28 25-28 25S8 62 8 49V8Z" />
      <path className="emblem-rim" d="M13 13h46v35c0 9-23 20-23 20S13 57 13 48V13Z" />
      <path className="emblem-crown" d="M21 8V4m15 4V2m15 6V4" />
      <g className="emblem-drawing" strokeLinecap="round" strokeLinejoin="round">
        {kind === "market" ? (
          <>
            <path d="M23 49V36h7v13m6 0V29h7v20m6 0V23h7v26M20 54h38" />
            <path d="m21 30 12-9 9 3 12-11" />
            <path d="M47 13h7v7" />
          </>
        ) : kind === "build" ? (
          <>
            <path d="m23 20 25 30m-3-31L24 49M19 17l3 13 8-7-11-6Zm32-1-3 14-8-7 11-7ZM20 44l10 9m12-9 10 9M21 54l-4 5m32-6 5 6" />
            <path d="M31 33h12v12c0 5-6 8-6 8s-6-3-6-8V33Z" />
          </>
        ) : kind === "calculator" ? (
          <>
            <path d="M21 22h32v33H21zM25 18h24M21 31h32m-32 9h32m-32 9h32" />
            <path d="M28 27v8m16 0v9m-10 0v9" />
            <path className="emblem-beads" d="M25 28h6v6h-6zm16 9h6v6h-6zm-10 9h6v6h-6z" />
          </>
        ) : (
          <>
            <path d="M20 21h32v19l-16 10-16-10V21ZM36 21v29m-16-21h32M18 19v39m36-39v39M14 59h44" />
            <path d="m30 36 6-6 6 6-6 6-6-6Z" />
          </>
        )}
      </g>
      <path className="emblem-star" d="m36 60 2 3-2 3-2-3 2-3Z" />
    </svg>
  );
}
