import Link from "@/components/link";
import { ItemIcon } from "./item-icon";
import { EquipmentGlyph } from "./equipment-overview";
import { equipmentName } from "@/lib/albion/equipment-catalog";

type HomeBuild = {
  id: string;
  title: string;
  contentType: string;
  version: number;
  author: { name: string | null };
  equipment: { slot: string; itemId: string; quality: number }[];
};

export function HomeBuildCard({ build }: { build: HomeBuild }) {
  const weapon = build.equipment.find((item) => item.slot === "Main hand");
  return (
    <Link className="homepage-build-tile" href={`/builds/${build.id}`} title={build.title}>
      <div className="homepage-build-heading">
        <div
          className="homepage-build-icon"
          aria-label={weapon ? equipmentName(weapon.itemId) : "No weapon assigned"}
        >
          {weapon ? (
            <ItemIcon id={weapon.itemId} quality={weapon.quality} size={52} />
          ) : (
            <EquipmentGlyph slot="Main hand" />
          )}
        </div>
        <span className="homepage-content-type">{build.contentType}</span>
      </div>
      <h3>{build.title}</h3>
      <div className="homepage-build-loadout" aria-label="Saved equipment">
        {["Helmet", "Chest", "Boots", "Cape", "Off hand", "Food", "Potion"].map((slot) => {
          const item = build.equipment.find((entry) => entry.slot === slot);
          // Optional equipment is shown only when it is actually saved on this build.
          if (!item && ["Off hand", "Food", "Potion"].includes(slot)) return null;
          const label = `${slot}: ${item ? equipmentName(item.itemId) : "Not assigned"}`;
          return (
            <span
              className={`homepage-gear-slot${item ? " filled" : ""}`}
              key={slot}
              aria-label={label}
              title={label}
            >
              {item ? (
                <ItemIcon id={item.itemId} quality={item.quality} size={32} />
              ) : (
                <EquipmentGlyph slot={slot} />
              )}
            </span>
          );
        })}
      </div>
      <span className="homepage-build-author" title={build.author.name || undefined}>
        {build.author.name ? `By ${build.author.name}` : "Author unnamed"}
        <span className="numeric" title="Saved revision, not a game patch">
          {" "}
          · v{build.version}
        </span>
      </span>
    </Link>
  );
}
