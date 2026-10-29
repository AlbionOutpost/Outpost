import { Backpack, FlaskConical, Shield, Sword, UtensilsCrossed } from "lucide-react";
/** Original functional outlines for empty equipment slots, never substitute item artwork. */
export function InventorySlotGlyph({ slot }: { slot: string }) {
  const common = { size: 34, strokeWidth: 1.5, "aria-hidden": true as const };
  if (slot === "Bag") return <Backpack {...common} />;
  if (slot === "Main hand") return <Sword {...common} />;
  if (slot === "Off hand") return <Shield {...common} />;
  if (slot === "Potion") return <FlaskConical {...common} />;
  if (slot === "Food") return <UtensilsCrossed {...common} />;
  return (
    <svg
      viewBox="0 0 40 40"
      width="36"
      height="36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {slot === "Helmet" ? (
        <>
          <path d="M10 21v-5a10 10 0 0 1 20 0v11l-6 7H14l-4-7z" />
          <path d="M10 19h20M12 23h8v9M30 23h-6v8M20 7v7" />
          <path d="M11 27l4 2M29 27l-3 2" />
        </>
      ) : slot === "Chest" ? (
        <>
          <path d="M14 6c1 5 11 5 12 0l7 6-4 8-2-2 1 16H12l1-16-2 2-4-8z" />
          <path d="M14 6l-1 10 7 4 7-4-1-10M20 20v13M14 28h12" />
        </>
      ) : slot === "Boots" ? (
        <>
          <path d="M7 5h9l-1 17 4 5v6H5v-7l3-4zM24 5h9l-1 17 4 5v6H22v-7l3-4z" />
          <path d="M8 10h7M25 10h7M6 29h11M23 29h11" />
        </>
      ) : slot === "Cape" ? (
        <>
          <path d="M15 8c1-5 9-5 10 0l6 4 3 23-14-4-14 4 3-23z" />
          <path d="M15 8l5 5 5-5M20 13v18M9 12l6 6M31 12l-6 6" />
        </>
      ) : slot === "Mount" ? (
        <>
          <path d="M11 33l2-12-6-6 6-6 2-5 5 3 7 1 5 5-3 6-7-1-1 7 9 8z" />
          <path d="M13 9l7 5-2 8M15 5l-1 8M21 25l-8 7M28 13h.1" />
        </>
      ) : null}
    </svg>
  );
}
