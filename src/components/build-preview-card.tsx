import Link from "@/components/link";
import { FavoriteBuildButton } from "./favorite-build-button";
import { EquipmentStrip } from "./equipment-strip";
import { EquipmentGlyph } from "./equipment-overview";

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
const previewSlots = [
  "Main hand",
  "Off hand",
  "Helmet",
  "Chest",
  "Boots",
  "Cape",
  "Bag",
  "Food",
  "Potion",
  "Mount",
];
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
  const equipment = b.equipment.filter((item) => item.itemId);
  return (
    <article className="build-preview-card loadout-card">
      <Link href={`/builds/${b.id}`} className="build-preview-link loadout-card-link">
        <div className="loadout-card-heading">
          <h2>{b.title}</h2>
          <span className="loadout-activity" data-activity={b.contentType}>
            {b.contentType}
          </span>
        </div>
        {equipment.length ? (
          <EquipmentStrip equipment={equipment} slots={previewSlots} hideEmpty size={44} />
        ) : (
          <div className="loadout-card-empty">
            <EquipmentGlyph slot="Main hand" />
            <span>Equipment not assigned</span>
          </div>
        )}
      </Link>
      <div className="loadout-card-footer">
        <div className="loadout-card-author">
          <span>By {b.author.name || "Adventurer"}</span>
          <small>
            <span title="Saved revision, not an Albion patch">v{b.version}</span> ·{" "}
            <time dateTime={b.updatedAt.toISOString()}>
              {b.updatedAt.toISOString().slice(0, 10)}
            </time>
          </small>
        </div>
        <FavoriteBuildButton
          id={b.id}
          title={b.title}
          authenticated={authenticated}
          initialSaved={saved}
          initialCount={favoriteCount}
        />
      </div>
    </article>
  );
}
