import Link from "@/components/build-region-link";
import { useId } from "react";
import { ArrowUpRight, Swords } from "lucide-react";
import { ItemIcon } from "./item-icon";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { SpellIcon } from "./spell-icon";
import { HeartChip } from "./heart-chip";
import { LoadoutBoard } from "./loadout-board";
import { activityName, type LibraryBuild } from "@/lib/grind-library-types";
import { librarySpellNames } from "@/lib/grind-library";
import { brandCopy } from "@/lib/brand-copy";
import { discoveryDate } from "@/lib/build-discovery";

/**
 * One library build as a window: title, activity and its upvotes with the device-saving heart
 * on the bar; the weapon, author and recorded abilities beside the loadout on the game's
 * board (a four-piece armor preview on phones); the update date and the way in below.
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
    date = discoveryDate(build.updatedAt),
    names = await librarySpellNames();
  const slug = build.slug.length <= 200 ? build.slug : build.id;
  const preview = ["Helmet", "Chest", "Boots", "Cape"].flatMap((slot) => {
    const row = build.equipment.find((item) => item.slot === slot);
    return row ? [row] : [];
  });
  const href = `/builds/library/${encodeURIComponent(slug)}`;
  const about = brandCopy(build.description || "").trim();
  return (
    <article
      className="raised has-scene library-build-card ecosystem-build-card"
      data-scene={sceneFor(build.id)}
      data-activity={build.category}
    >
      <div className="library-card-bar">
        <Link href={href} aria-labelledby={titleId} className="ecosystem-title-link">
          <h2 id={titleId}>{build.title}</h2>
        </Link>
        <span className="landing-chips">
          <span className="landing-chip ecosystem-activity">
            {activityName(build.category) || "Other"}
          </span>
          <HeartChip
            count={build.upvotes}
            className="library-device-save"
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
        </span>
      </div>
      <div className="ecosystem-card-main">
        <div className="library-build-identity">
          <span
            className="library-primary-weapon"
            title={main ? equipmentName(main.itemId) : "Main hand not assigned"}
          >
            {main ? (
              <ItemIcon id={main.itemId} size={64} />
            ) : (
              <Swords size={28} aria-hidden="true" />
            )}
          </span>
          <div className="library-build-copy">
            <p className="library-build-classification">
              <strong>{build.weaponName || "Equipment plan"}</strong>
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
            <div className="ecosystem-card-spells" aria-label="Recorded main hand abilities">
              {main?.skills.length ? (
                main.skills.slice(0, 4).map((id, i) => (
                  <span key={`${id}-${i}`} title={names[id] || id}>
                    <SpellIcon id={id} name={names[id] || id} size={26} />
                    <span className="sr-only">{names[id] || id}</span>
                  </span>
                ))
              ) : (
                <span className="ecosystem-no-spells">No recorded abilities</span>
              )}
            </div>
            {/* The author's notes fill the space beside the board */}
            <p className={`library-card-description${about ? "" : " is-empty"}`}>
              {about || "No notes from the author."}
            </p>
          </div>
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
        </div>
        <div className="library-build-board">
          <LoadoutBoard
            pieces={build.equipment}
            size="mini"
            abilities={false}
            label={`${build.title} loadout`}
          />
        </div>
      </div>
      <Link href={href} className="library-card-caption" aria-hidden="true" tabIndex={-1}>
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
      </Link>
    </article>
  );
}

/* Each card gets one of the paintings, chosen from the build id so it stays put across visits */
const scenes = ["build", "composition", "city", "economy", "market"] as const;
function sceneFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return scenes[hash % scenes.length];
}
