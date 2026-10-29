import Link from "@/components/build-region-link";
import { useId } from "react";
import { ItemIcon } from "./item-icon";
import { FavoriteBuildButton } from "./favorite-build-button";
import { BuildCardOwnerActions } from "./build-card-owner-actions";
import { EquipmentStrip } from "./equipment-strip";
import { EquipmentGlyph } from "./equipment-overview";
import { SpellIcon } from "./spell-icon";
import { archivedSpellOptions } from "@/lib/albion/equipment-abilities";
import { discoveryDate } from "@/lib/build-discovery";
export type PreviewBuild = {
  id: string;
  title: string;
  description: string;
  contentType: string;
  visibility: string;
  version: number;
  updatedAt: Date;
  author: { name: string | null };
  equipment: { slot: string; itemId: string; quality: number; abilitySelections?: unknown }[];
};
const previewSlots = ["Helmet", "Chest", "Boots", "Cape", "Food"];
export function BuildPreviewCard({
  build: b,
  authenticated,
  saved,
  favoriteCount,
  owned = false,
}: {
  build: PreviewBuild;
  authenticated: boolean;
  saved: boolean;
  favoriteCount: number;
  owned?: boolean;
}) {
  const titleId = useId();
  const equipment = b.equipment.filter((item) => item.itemId),
    main = equipment.find((e) => e.slot === "Main hand"),
    date = discoveryDate(b.updatedAt);
  const choices =
    main?.abilitySelections &&
    typeof main.abilitySelections === "object" &&
    !Array.isArray(main.abilitySelections)
      ? Object.values(main.abilitySelections)
      : [];
  const spells = main
    ? archivedSpellOptions(main.itemId)
        .filter((spell) => choices.includes(spell.name))
        .slice(0, 4)
    : [];
  return (
    <article className="build-preview-card loadout-card ecosystem-build-card">
      <div className="build-preview-link loadout-card-link ecosystem-card-main">
        <div className="ecosystem-card-topline">
          <span className="ecosystem-activity">{b.contentType}</span>
          <span className="ecosystem-card-kind">
            {b.visibility === "PUBLIC" ? "Community" : b.visibility.toLowerCase()}
          </span>
        </div>
        <div className="library-build-identity">
          {main && <ItemIcon id={main.itemId} quality={main.quality} size={64} />}
          <div>
            <Link
              href={`/builds/${b.id}`}
              aria-labelledby={titleId}
              className="ecosystem-title-link"
            >
              <h2 id={titleId}>{b.title}</h2>
            </Link>
            <small>
              By {b.author.name || "Adventurer"}
              {date && (
                <>
                  {" "}
                  · <time dateTime={b.updatedAt.toISOString()}>{date}</time>
                </>
              )}
            </small>
          </div>
        </div>
        {equipment.length ? (
          <EquipmentStrip equipment={equipment} slots={previewSlots} hideEmpty={false} size={40} />
        ) : (
          <div className="loadout-card-empty">
            <EquipmentGlyph slot="Main hand" />
            <span>Equipment not assigned</span>
          </div>
        )}
        <div className="ecosystem-card-spells" aria-label="Selected main hand abilities">
          {spells.length ? (
            spells.map((spell) => (
              <span key={spell.id} title={spell.name}>
                <SpellIcon id={spell.id} name={spell.name} size={27} />
                <span className="sr-only">{spell.name}</span>
              </span>
            ))
          ) : (
            <span className="ecosystem-no-spells">No recorded main hand abilities</span>
          )}
        </div>
      </div>
      <div className="loadout-card-footer">
        <div className="loadout-card-author">
          <small>
            <span title="Saved revision, not an Albion patch">Revision {b.version}</span> ·{" "}
            {equipment.length} equipment slots
          </small>
        </div>
        <FavoriteBuildButton
          id={b.id}
          title={b.title}
          authenticated={authenticated}
          initialSaved={saved}
          initialCount={favoriteCount}
        />
        {owned && <BuildCardOwnerActions id={b.id} title={b.title} />}
      </div>
    </article>
  );
}
