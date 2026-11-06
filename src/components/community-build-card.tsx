import { useId } from "react";
import { BuildWindow } from "./library-build-card";
import { FavoriteBuildButton } from "./favorite-build-button";
import { BuildCardOwnerActions } from "./build-card-owner-actions";
import { archivedSpellOptions } from "@/lib/albion/equipment-abilities";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import type { PreviewBuild } from "./build-preview-card";

const visibilityLabel: Record<string, string> = { PRIVATE: "Private", UNLISTED: "Unlisted" };

/**
 * A player's build in the same window as a library build: title and account ♥ on the bar,
 * the board beside the weapon, author, activity and chosen abilities, then the date, its
 * visibility when it is not public, the owner's menu and the way in.
 */
export function CommunityBuildCard({
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
  const pieces = b.equipment.filter((item) => item.itemId),
    main = pieces.find((e) => e.slot === "Main hand");
  const choices =
    main?.abilitySelections &&
    typeof main.abilitySelections === "object" &&
    !Array.isArray(main.abilitySelections)
      ? Object.values(main.abilitySelections)
      : [];
  const spells = main
    ? archivedSpellOptions(main.itemId).filter((spell) => choices.includes(spell.name))
    : [];
  const visibility = visibilityLabel[b.visibility];
  return (
    <BuildWindow
      className="library-build-card community-build-card"
      titleId={titleId}
      href={`/builds/${b.id}`}
      title={b.title}
      category={b.contentType}
      activity={b.contentType || "Other"}
      weaponName={main ? equipmentName(main.itemId) : ""}
      author={b.author.name}
      updatedAt={b.updatedAt}
      about={b.description}
      pieces={pieces}
      spells={spells}
      heart={
        <>
          {visibility && <span className="landing-chip">{visibility}</span>}
          <FavoriteBuildButton
            heart
            id={b.id}
            title={b.title}
            authenticated={authenticated}
            initialSaved={saved}
            initialCount={favoriteCount}
          />
        </>
      }
      caption={owned && <BuildCardOwnerActions id={b.id} title={b.title} />}
    />
  );
}
