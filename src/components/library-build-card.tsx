import Link from "@/components/build-region-link";
import { useId, type CSSProperties, type ReactNode } from "react";
import { activityBackgroundFor } from "@/lib/activity-backgrounds";
import { ArrowUpRight, Swords } from "lucide-react";
import { ItemIcon } from "./item-icon";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { SpellIcon } from "./spell-icon";
import { HeartChip } from "./heart-chip";
import { LoadoutBoard, type BoardPiece } from "./loadout-board";
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
      author={build.author}
      updatedAt={build.updatedAt}
      about={build.description}
      pieces={build.equipment}
      spells={(main?.skills ?? []).map((id) => ({ id, name: names[id] || id }))}
      heart={
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
      }
    />
  );
}

/**
 * The window chrome every build card shares (library and player builds): the title bar with
 * its heart, the mini board beside the weapon, author, activity chip, recorded abilities and
 * notes, then the caption with the date and the way in. `caption` adds quiet labels or the
 * owner's menu before "View build".
 */
export function BuildWindow({
  className,
  titleId,
  href,
  title,
  category,
  activity,
  weaponName,
  author,
  updatedAt,
  about: notes,
  pieces,
  spells,
  heart,
  caption,
}: {
  className: string;
  titleId: string;
  href: string;
  title: string;
  /** Activity id or label, for the window's painting. */
  category: string;
  activity: string;
  weaponName: string;
  author: string | null;
  updatedAt: string | Date;
  about: string;
  pieces: BoardPiece[];
  spells: { id: string; name: string }[];
  heart: ReactNode;
  caption?: ReactNode;
}) {
  const main = pieces.find((row) => row.slot === "Main hand"),
    date = discoveryDate(updatedAt),
    dateTime = date ? new Date(updatedAt).toISOString() : "";
  const preview = ["Helmet", "Chest", "Boots", "Cape"].flatMap((slot) => {
    const row = pieces.find((item) => item.slot === slot);
    return row ? [row] : [];
  });
  const art = activityBackgroundFor(category);
  const about = brandCopy(notes || "").trim();
  const way = (
    <span>
      View build <ArrowUpRight size={13} aria-hidden="true" />
    </span>
  );
  const when = (
    <span>
      {date ? <time dateTime={dateTime}>Updated {date}</time> : "Update date unavailable"}
    </span>
  );
  return (
    <article
      className={`raised has-scene ${className} ecosystem-build-card`}
      data-scene="build"
      data-activity-background={art?.src}
      style={art ? ({ "--scene": `url("${art.src}")` } as CSSProperties) : undefined}
      data-activity={category}
    >
      <div className="library-card-bar">
        <Link href={href} aria-labelledby={titleId} className="ecosystem-title-link">
          <h2 id={titleId}>{title}</h2>
        </Link>
        <span className="landing-chips">{heart}</span>
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
              <strong>{weaponName || "Equipment plan"}</strong>
            </p>
            <small>
              By {author || "Adventurer"}
              {date && (
                <span className="library-mobile-date">
                  {" "}
                  · <time dateTime={dateTime}>{date}</time>
                </span>
              )}
            </small>
            <span className="landing-chip ecosystem-activity">{activity}</span>
            <div className="ecosystem-card-spells" aria-label="Recorded main hand abilities">
              {spells.length ? (
                spells.slice(0, 4).map((spell, i) => (
                  <span key={`${spell.id}-${i}`} title={spell.name}>
                    <SpellIcon id={spell.id} name={spell.name} size={26} />
                    <span className="sr-only">{spell.name}</span>
                  </span>
                ))
              ) : (
                <span className="ecosystem-no-spells">No recorded abilities</span>
              )}
            </div>
            {/* The author's notes fill the space beside the board; none, nothing shown */}
            {about && <p className="library-card-description">{about}</p>}
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
          <LoadoutBoard pieces={pieces} size="mini" abilities={false} label={`${title} loadout`} />
        </div>
      </div>
      {caption ? (
        <div className="library-card-caption">
          {when}
          <span className="build-window-caption-end">
            {caption}
            <Link href={href} aria-hidden="true" tabIndex={-1}>
              {way}
            </Link>
          </span>
        </div>
      ) : (
        <Link href={href} className="library-card-caption" aria-hidden="true" tabIndex={-1}>
          {when}
          {way}
        </Link>
      )}
    </article>
  );
}
