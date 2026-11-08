import { useId } from "react";
import { HeartChip } from "./heart-chip";
import { BuildWindow } from "./build-window";
import { activityName, type LibraryBuild } from "@/lib/grind-library-types";
import { librarySpellNames } from "@/lib/grind-library";
import { savedLibraryBuild } from "@/lib/build-device-collections";

/**
 * One library build as the landing's build window: title, activity and the archive's
 * upvotes with the device-saving heart on the bar, the loadout on the board, and the weapon,
 * author and update date in the foot.
 */
export function LibraryBuildCard({ build }: { build: LibraryBuild }) {
  const titleId = useId();
  return <LibraryBuildCardContent build={build} titleId={titleId} />;
}
async function LibraryBuildCardContent({
  build,
  titleId,
}: {
  build: LibraryBuild;
  titleId: string;
}) {
  const main = build.equipment.find((row) => row.slot === "Main hand"),
    names = await librarySpellNames();
  const slug = build.slug.length <= 200 ? build.slug : build.id;
  return (
    <BuildWindow
      className="library-build-card"
      titleId={titleId}
      href={`/builds/library/${encodeURIComponent(slug)}`}
      title={build.title}
      category={build.category}
      activity={activityName(build.category) || "Other"}
      weaponName={build.weaponName}
      weaponItemId={main?.itemId}
      author={build.author}
      updatedAt={build.updatedAt}
      pieces={build.equipment}
      spellNames={names}
      heart={
        <HeartChip
          count={build.upvotes}
          className="library-device-save"
          build={savedLibraryBuild(build)}
        />
      }
    />
  );
}
