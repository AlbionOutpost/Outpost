import { useId } from "react";
import { BuildWindow } from "./build-window";
import { FavoriteBuildButton } from "./favorite-build-button";
import { BuildCardOwnerActions } from "./build-card-owner-actions";
import { archivedSpellOptions } from "@/lib/albion/equipment-abilities";
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
  equipment: { slot: string; itemId: string; quality: number; abilitySelections?: unknown }[];
};

const visibilityLabel: Record<string, string> = { PRIVATE: "Private", UNLISTED: "Unlisted" };

/** The abilities a player chose for a piece, as spell ids, in the order the game shows them. */
function chosenSpells(itemId: string, selections: unknown) {
  if (!selections || typeof selections !== "object" || Array.isArray(selections)) return [];
  const options = archivedSpellOptions(itemId);
  return Object.entries(selections).flatMap(([key, name]) => {
    const spell = options.find((option) => option.key === key && option.name === name);
    return spell ? [spell] : [];
  });
}

/**
 * A player's build in the landing's build window: title, activity (and its visibility when
 * it is not public) with the account ♥ on the bar, the loadout with the chosen abilities on
 * the board, and the weapon, author, date and the owner's menu in the foot.
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
  const names: Record<string, string> = {};
  const pieces = b.equipment
    .filter((item) => item.itemId)
    .map((item) => {
      const spells = chosenSpells(item.itemId, item.abilitySelections);
      for (const spell of spells) names[spell.id] = spell.name;
      return { slot: item.slot, itemId: item.itemId, skills: spells.map((spell) => spell.id) };
    });
  const main = pieces.find((e) => e.slot === "Main hand");
  const visibility = visibilityLabel[b.visibility];
  return (
    <BuildWindow
      className="community-build-card"
      titleId={titleId}
      href={`/builds/${b.id}`}
      title={b.title}
      category={b.contentType}
      activity={
        visibility ? `${b.contentType || "Other"} · ${visibility}` : b.contentType || "Other"
      }
      weaponName={main ? equipmentName(main.itemId) : ""}
      weaponItemId={main?.itemId}
      author={b.author.name}
      updatedAt={b.updatedAt}
      pieces={pieces}
      spellNames={names}
      heart={
        <FavoriteBuildButton
          heart
          id={b.id}
          title={b.title}
          authenticated={authenticated}
          initialSaved={saved}
          initialCount={favoriteCount}
        />
      }
      owner={owned ? <BuildCardOwnerActions id={b.id} title={b.title} /> : undefined}
    />
  );
}
