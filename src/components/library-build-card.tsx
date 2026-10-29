import Link from "@/components/build-region-link";
import { useId } from "react";
import { ArrowUpRight, Swords } from "lucide-react";
import { ItemIcon } from "./item-icon";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { SpellIcon } from "./spell-icon";
import { LibrarySaveButton } from "./library-save-button";
import { activityName, type LibraryBuild } from "@/lib/grind-library-types";
import { librarySpellNames } from "@/lib/grind-library";
import { brandCopy } from "@/lib/brand-copy";
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
  const preview = ["Helmet", "Chest", "Boots", "Cape"].flatMap((slot) => {
    const row = build.equipment.find((item) => item.slot === slot);
    return row ? [row] : [];
  });
  return (
    <article className="library-build-card ecosystem-build-card" data-activity={build.category}>
      <div className="ecosystem-card-main">
        <div className="library-build-identity">
          <span
            className="library-primary-weapon"
            title={main ? equipmentName(main.itemId) : "Main hand not assigned"}
          >
            {main ? (
              <ItemIcon id={main.itemId} size={76} />
            ) : (
              <Swords size={28} aria-hidden="true" />
            )}
          </span>
          <div className="library-build-copy">
            <Link
              href={`/builds/library/${encodeURIComponent(slug)}`}
              aria-labelledby={titleId}
              className="ecosystem-title-link"
            >
              <h2 id={titleId}>{build.title}</h2>
            </Link>
            <p className="library-build-classification">
              <span>{build.weaponName || "Equipment plan"}</span>
              <span className="ecosystem-activity">{activityName(build.category) || "Other"}</span>
            </p>
            <small>
              By {build.author || "Adventurer"}
              {date && (
                <span className="library-mobile-date">
                  {" "}
                  · <time dateTime={new Date(build.updatedAt).toISOString()}>{date}</time>
                </span>
              )}
            </small>
          </div>
        </div>
        <div className="library-build-preview">
          <div
            className="library-build-equipment"
            aria-label="Armor preview; full equipment on build detail"
          >
            {preview.map((row) => (
              <span key={row.slot} title={`${row.slot}: ${equipmentName(row.itemId)}`}>
                <ItemIcon id={row.itemId} size={32} />
                <span className="sr-only">
                  {row.slot}: {equipmentName(row.itemId)}
                </span>
              </span>
            ))}
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
        </div>
        {brandCopy(build.description || "").trim().length >= 24 && (
          <p className="library-card-description">{brandCopy(build.description)}</p>
        )}
        <div className="library-card-caption">
          <span>
            {date ? (
              <time dateTime={new Date(build.updatedAt).toISOString()}>Updated {date}</time>
            ) : (
              "Update date unavailable"
            )}
          </span>
          <span>
            View build <ArrowUpRight size={13} aria-hidden="true" />
          </span>
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
