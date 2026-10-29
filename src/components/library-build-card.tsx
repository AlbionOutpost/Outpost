import Link from "@/components/build-region-link";
import { useId } from "react";
import { X } from "lucide-react";
import { ItemIcon } from "./item-icon";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { SpellIcon } from "./spell-icon";
import { LibrarySaveButton } from "./library-save-button";
import { activityName, type LibraryBuild } from "@/lib/grind-library-types";
import { librarySpellNames } from "@/lib/grind-library";
import { discoveryDate } from "@/lib/build-discovery";
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
    date = discoveryDate(build.updatedAt),
    names = await librarySpellNames();
  const slug = build.slug.length <= 200 ? build.slug : build.id;
  const order = ["Main hand", "Off hand", "Helmet", "Chest", "Boots", "Cape", "Food", "Potion"];
  return (
    <article className="library-build-card ecosystem-build-card" data-activity={build.category}>
      <div className="ecosystem-card-main">
        <div className="ecosystem-card-topline">
          <span className="ecosystem-activity">{activityName(build.category) || "Other"}</span>
        </div>
        <div className="library-build-identity">
          <div>
            <Link
              href={`/builds/library/${encodeURIComponent(slug)}`}
              aria-labelledby={titleId}
              className="ecosystem-title-link"
            >
              <h2 id={titleId}>{build.title}</h2>
            </Link>
            <small>
              By {build.author || "Adventurer"}
              {date && (
                <>
                  {" "}
                  · <time dateTime={new Date(build.updatedAt).toISOString()}>{date}</time>
                </>
              )}
            </small>
          </div>
        </div>
        <div className="library-build-equipment" aria-label="Equipment">
          {order.map((slot) => {
            const row = build.equipment.find((row) => row.slot === slot);
            return row ? (
              <span key={slot} title={`${slot}: ${equipmentName(row.itemId)}`}>
                <ItemIcon id={row.itemId} size={40} />
                <span className="sr-only">
                  {row.slot}: {equipmentName(row.itemId)}
                </span>
              </span>
            ) : (
              <span key={slot} className="ecosystem-empty-slot" title={`${slot}: Empty`}>
                <X size={18} />
                <span className="sr-only">{slot}: Empty</span>
              </span>
            );
          })}
        </div>
        <div className="ecosystem-card-spells" aria-label="Recorded main hand abilities">
          {main?.skills.length ? (
            main.skills.slice(0, 4).map((id, i) => (
              <span key={`${id}-${i}`} title={names[id] || id}>
                <SpellIcon id={id} name={names[id] || id} size={27} />
                <span className="sr-only">{names[id] || id}</span>
              </span>
            ))
          ) : (
            <span className="ecosystem-no-spells">No recorded main hand abilities</span>
          )}
        </div>
        <div className="library-card-caption">
          <span>{build.weaponName || "Equipment plan"}</span>
          <span>View loadout →</span>
        </div>
      </div>
      <LibrarySaveButton
        build={{
          id: build.id,
          slug,
          title: build.title.slice(0, 200),
          author: build.author.slice(0, 100),
          weaponName: build.weaponName.slice(0, 100),
          category: build.category,
          itemId: main?.itemId || "",
          updatedAt: build.updatedAt,
        }}
      />
    </article>
  );
}
