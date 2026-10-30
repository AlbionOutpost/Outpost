import type { ReactNode } from "react";
import { ItemIcon } from "@/components/item-icon";
import Link from "@/components/link";
import { SpellIcon } from "@/components/spell-icon";
import { ToolIcon } from "@/components/tool-icon";
import { weaponRole } from "@/lib/compositions/weapon-roles";
import type { LibraryBuild, LibraryComposition, LibraryGuide } from "@/lib/grind-library-types";
import { activityName } from "@/lib/grind-library-types";
import { ArrowRight } from "lucide-react";
import { MarketStrip, type StripItem } from "./market-strip";

type Glyph = Parameters<typeof ToolIcon>[0]["name"];

/** The eight pieces the strip shows, in the game's order; the hands share one well. */
const stripSlots = ["Main hand", "Helmet", "Chest", "Cape", "Boots", "Food", "Potion", "Mount"];
const marks: Record<string, string> = {
  Cape: "/albion/slots/cape.svg",
  Food: "/albion/slots/food.svg",
  Potion: "/albion/slots/potion.svg",
  Mount: "/albion/slots/mount.svg",
};

/** Titlebar shared by the four windows: glyph, title, one control on the right. */
export function StripBar({
  glyph,
  children,
  control,
}: {
  glyph: Glyph;
  children: ReactNode;
  control?: ReactNode;
}) {
  return (
    <div className="strip-bar">
      <span className="strip-bar-glyph" aria-hidden="true">
        <ToolIcon name={glyph} size={16} />
      </span>
      <span className="strip-title">{children}</span>
      {control}
    </div>
  );
}

function Window({
  glyph,
  title,
  line,
  href,
  children,
}: {
  glyph: Glyph;
  title: string;
  line: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <article className="strip-window">
      {children}
      <div className="strip-window-foot">
        <span className="strip-window-emblem" aria-hidden="true">
          <ToolIcon name={glyph} size={20} />
        </span>
        <div>
          <strong>{title}</strong>
          <span>{line}</span>
        </div>
        <Link href={href} className="strip-window-go" aria-label={title}>
          <ArrowRight size={18} />
        </Link>
      </div>
    </article>
  );
}

/**
 * Four windows under the hero, each a real piece of the product: five market quotes with
 * their week, one public build on its pieces and keys, a five-member group build read by
 * weapon type, and a guide from the library. Nothing is staged.
 */
export function HeroStrip({
  market,
  build,
  spellNames,
  party,
  members,
  guide,
  suffix,
}: {
  market: { items: readonly StripItem[]; cities: readonly string[] };
  build: LibraryBuild | null;
  spellNames: Record<string, string>;
  party: LibraryComposition | null;
  members: LibraryBuild[];
  guide: LibraryGuide | null;
  suffix: string;
}) {
  const bySlot = new Map(build?.equipment.map((e) => [e.slot, e]));
  const main = bySlot.get("Main hand");
  const abilities = (main?.skills ?? []).filter((s) => !s.startsWith("PASSIVE")).slice(0, 3);
  const helmet = (bySlot.get("Helmet")?.skills ?? []).find((s) => !s.startsWith("PASSIVE"));
  const keyed = [...abilities.map((id, i) => ({ key: "QWE"[i], id })), { key: "D", id: helmet }];
  const swaps = (build?.equipment ?? [])
    .flatMap((e) => e.alternatives.map((itemId) => ({ slot: e.slot, itemId })))
    .slice(0, 5);
  const lookup = new Map(members.map((b) => [b.id, b]));
  const crew = (party?.members ?? []).flatMap((id) => {
    const b = lookup.get(id);
    return b ? [b] : [];
  });
  return (
    <div className="landing-strip" aria-label="A look inside Outpost">
      <Window
        glyph="market"
        title="Market data"
        line="Current orders across all cities and the Black Market."
        href={`/tools/market${suffix}`}
      >
        <MarketStrip items={market.items} cities={market.cities} suffix={suffix} />
      </Window>

      <Window
        glyph="equipment"
        title="Build planning"
        line="Create and share builds with full gear, abilities and swaps."
        href={`/builds/library${suffix}`}
      >
        {build ? (
          <>
            <StripBar
              glyph="equipment"
              control={<span className="landing-chip">{activityName(build.category)}</span>}
            >
              <Link href={`/builds/library/${encodeURIComponent(build.slug)}${suffix}`}>
                {build.title}
              </Link>
            </StripBar>
            <div className="strip-window-body build-strip">
              <div className="build-strip-body">
                <ul className="build-strip-keys" aria-label="Abilities by key">
                  {keyed.map(({ key, id }) => (
                    <li key={key} className={id ? undefined : "is-empty"}>
                      <kbd>{key}</kbd>
                      {id ? (
                        <SpellIcon id={id} name={spellNames[id] ?? id} size={28} />
                      ) : (
                        <span className="build-card-empty" title="Not recorded" />
                      )}
                    </li>
                  ))}
                </ul>
                <ul className="build-strip-grid" aria-label={`${build.title} equipment`}>
                  {stripSlots.map((slot) => {
                    const piece = bySlot.get(slot);
                    return (
                      <li
                        key={slot}
                        className={piece ? undefined : "is-empty"}
                        title={piece ? `${slot}: ${piece.itemId}` : `${slot}: not recorded`}
                      >
                        {piece ? (
                          <ItemIcon id={piece.itemId} size={56} />
                        ) : marks[slot] ? (
                          // eslint-disable-next-line @next/next/no-img-element -- owner-supplied mark
                          <img src={marks[slot]} alt="" aria-hidden="true" data-slot-mark={slot} />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="strip-row">
                <span className="strip-label">Swaps</span>
                {swaps.length ? (
                  <ul className="strip-icons" aria-label="Alternative pieces">
                    {swaps.map((swap) => (
                      <li key={`${swap.slot}-${swap.itemId}`} title={`${swap.slot}: ${swap.itemId}`}>
                        <ItemIcon id={swap.itemId} size={28} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="strip-muted">None recorded</span>
                )}
                <span className="strip-muted is-end">by {build.author}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="strip-window-body">
            <p className="strip-muted">No public build to show.</p>
          </div>
        )}
      </Window>

      <Window
        glyph="composition"
        title="Group coordination"
        line="Plan comps, share loadouts and run your content together."
        href={
          party
            ? `/compositions/library/${encodeURIComponent(party.slug)}${suffix}`
            : `/compositions${suffix}`
        }
      >
        {party && crew.length ? (
          <>
            <StripBar
              glyph="composition"
              control={
                <span className="strip-count">
                  <span className="strip-live" aria-hidden="true" />
                  {crew.length}/{party.members.length}
                </span>
              }
            >
              <Link href={`/compositions/library/${encodeURIComponent(party.slug)}${suffix}`}>
                {party.title}
              </Link>
            </StripBar>
            <div className="strip-window-body party-strip">
              <ul className="party-strip-members" aria-label="Members by weapon type">
                {crew.slice(0, 5).map((b) => {
                  const weapon = b.equipment.find((e) => e.slot === "Main hand");
                  const role = weaponRole(b.weaponName);
                  const spells = (weapon?.skills ?? [])
                    .filter((s) => !s.startsWith("PASSIVE"))
                    .slice(0, 2);
                  return (
                    <li key={b.id} data-role={role}>
                      <Link
                        href={`/builds/library/${encodeURIComponent(b.slug)}${suffix}`}
                        className="party-strip-member"
                        title={`${b.weaponName} · ${b.title}`}
                      >
                        <span className="party-strip-portrait">
                          {weapon ? <ItemIcon id={weapon.itemId} size={44} /> : null}
                        </span>
                        <strong>{b.weaponName}</strong>
                        <span className="party-strip-role">{role}</span>
                      </Link>
                      <span className="party-strip-spells">
                        {spells.map((id) => (
                          <SpellIcon key={id} id={id} name={spellNames[id] ?? id} size={20} />
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="strip-text">{party.description}</p>
              <div className="strip-row">
                <span className="strip-label">{activityName(party.category)}</span>
                <span className="strip-muted is-end">
                  Roles by weapon type · by {party.author}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="strip-window-body">
            <p className="strip-muted">No public group build to show.</p>
          </div>
        )}
      </Window>

      <Window
        glyph="reference"
        title="Guides"
        line="Learn, improve and master Albion with in-depth guides."
        href={`/guides${suffix}`}
      >
        {guide ? (
          <>
            <StripBar
              glyph="reference"
              control={<span className="landing-chip">{guide.category}</span>}
            >
              Guide
            </StripBar>
            <div className="strip-window-body guide-strip">
              <Link
                href={`/guides/${encodeURIComponent(guide.slug)}${suffix}`}
                className="guide-strip-cover"
              >
                {guide.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- archived guide cover
                  <img
                    src={guide.cover.src}
                    alt=""
                    width={guide.cover.width}
                    height={guide.cover.height}
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <span className="guide-strip-copy">
                  <strong>{guide.title}</strong>
                  <span>{guide.summary}</span>
                </span>
              </Link>
              <ol className="guide-strip-toc" aria-label="Sections">
                {guide.toc.slice(0, 3).map((entry, i) => (
                  <li key={entry.id}>
                    <Link href={`/guides/${encodeURIComponent(guide.slug)}${suffix}#${entry.id}`}>
                      <span className="guide-strip-n">{i + 1}</span>
                      {entry.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : (
          <div className="strip-window-body">
            <p className="strip-muted">No guide to show.</p>
          </div>
        )}
      </Window>
    </div>
  );
}
