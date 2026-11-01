import {
  Swords,
  Shield,
  HardHat,
  Shirt,
  Footprints,
  Backpack,
  Flag,
  FlaskConical,
  Apple,
  Route,
} from "lucide-react";
import { ItemIcon } from "./item-icon";
import { equipmentSlots } from "@/lib/albion/equipment-catalog";
import "@/app/equipment-workspace.css";

export function EquipmentGlyph({ slot }: { slot: string }) {
  const Glyph =
    (
      {
        "Main hand": Swords,
        "Off hand": Shield,
        Helmet: HardHat,
        Chest: Shirt,
        Boots: Footprints,
        Cape: Flag,
        Bag: Backpack,
        Mount: Route,
        Food: Apple,
        Potion: FlaskConical,
      } as Record<string, typeof Swords>
    )[slot] || Swords;
  return <Glyph size={20} aria-hidden="true" />;
}

export function EquipmentOverview({
  equipment,
}: {
  equipment: { slot: string; itemId: string; quality: number }[];
}) {
  return (
    <div className="inventory-preview" role="group" aria-label="Equipment overview">
      {equipmentSlots.map((slot) => {
        const item = equipment.find((e) => e.slot === slot && e.itemId);
        return (
          <div className={`inventory-slot${item ? " equipped" : ""}`} key={slot}>
            {item ? (
              <ItemIcon id={item.itemId} quality={item.quality} size={48} />
            ) : (
              <EquipmentGlyph slot={slot} />
            )}
            <span>{slot}</span>
            {item && (
              <b>
                {item.itemId.match(/^T\d/)?.[0] || "Item"}.{item.itemId.match(/@(\d)$/)?.[1] || "0"}
              </b>
            )}
          </div>
        );
      })}
    </div>
  );
}
