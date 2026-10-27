import Link from "next/link";
import { FavoriteBuildButton } from "./favorite-build-button";
import { ItemIcon } from "./item-icon";
import { EquipmentStrip } from "./equipment-strip";
import { EquipmentGlyph } from "./equipment-overview";
import { equipmentName } from "@/lib/albion/equipment-catalog";
export type PreviewBuild = {
  id: string;
  title: string;
  description: string;
  contentType: string;
  visibility: string;
  version: number;
  updatedAt: Date;
  author: { name: string | null };
  equipment: { slot: string; itemId: string; quality: number }[];
};
export function BuildPreviewCard({
  build: b,
  authenticated,
  saved,
  favoriteCount,
}: {
  build: PreviewBuild;
  authenticated: boolean;
  saved: boolean;
  favoriteCount: number;
}) {
  const weapon = b.equipment.find((e) => e.slot === "Main hand");
  return (
    <article className="build-preview-card">
      <FavoriteBuildButton
        id={b.id}
        title={b.title}
        authenticated={authenticated}
        initialSaved={saved}
        initialCount={favoriteCount}
      />
      <Link href={`/builds/${b.id}`} className="build-preview-link">
        <div className="build-card-art">
          <span className="card-category">{b.contentType}</span>
          {weapon ? (
            <ItemIcon id={weapon.itemId} quality={weapon.quality} size={92} />
          ) : (
            <EquipmentGlyph slot="Main hand" />
          )}
          <span className="build-weapon-label">
            {weapon ? equipmentName(weapon.itemId) : "Loadout in progress"}
          </span>
        </div>
        <div className="build-card-content">
          <h2>{b.title}</h2>
          <EquipmentStrip equipment={b.equipment} size={40} />
          <p>
            {b.description.slice(0, 120) ||
              "Open the loadout to inspect equipment, abilities and author notes."}
          </p>
          <div className="build-card-byline">
            <span>By {b.author.name || "Adventurer"}</span>
            <span className="numeric" title="Saved build revision, not an Albion patch number">
              v{b.version}
            </span>
          </div>
          <div className="build-card-date">
            {b.visibility.toLowerCase()} · Updated{" "}
            <time dateTime={b.updatedAt.toISOString()}>
              {b.updatedAt.toISOString().slice(0, 10)}
            </time>
          </div>
        </div>
      </Link>
    </article>
  );
}
