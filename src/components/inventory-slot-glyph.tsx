/** Empty-slot marks from the owner's sheet (public/albion/slots), as in the game's inventory:
 * bag, cape, potion, food and mount carry a mark; head, chest, boots and the hands stay as
 * empty wells. Never an equipped record. */
const marks: Record<string, string> = {
  Bag: "/albion/slots/bag.svg",
  Cape: "/albion/slots/cape.svg",
  Potion: "/albion/slots/potion.svg",
  Food: "/albion/slots/food.svg",
  Mount: "/albion/slots/mount.svg",
};
export function InventorySlotGlyph({ slot }: { slot: string }) {
  const mark = marks[slot];
  if (!mark) return null;
  // eslint-disable-next-line @next/next/no-img-element -- owner-supplied mark
  return (
    <img
      className="inventory-slot-mark"
      data-slot-mark={slot}
      src={mark}
      alt=""
      aria-hidden="true"
    />
  );
}
