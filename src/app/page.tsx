import "./homepage.css";
import { ItemIcon } from "@/components/item-icon";
import { ToolIcon } from "@/components/tool-icon";
import { featuredLibraryBuilds, libraryCounts } from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { gameDataSource } from "@/lib/albion/game/recipes";
import { tools } from "@/lib/tool-directory";
import { cookies } from "next/headers";
import Link from "@/components/link";
import { ArrowRight, BookOpen, ChartNoAxesCombined, Search, Swords, Users } from "lucide-react";
import { regionSchema } from "@/lib/albion/region-config";

// Scenes are the owner-authorised paintings in public/albion/illustrations; each tile crops a
// different part of one so the six tools read as six places, not one repeated image.
const toolTiles = [
  {
    href: "/tools/market",
    title: "Market Explorer",
    scene: "market",
    at: "30% 40%",
    icon: "market",
  },
  {
    href: "/builds/library",
    title: "Build Library",
    scene: "build",
    at: "50% 30%",
    icon: "equipment",
  },
  {
    href: "/tools/crafting",
    title: "Crafting Calculator",
    scene: "hero",
    at: "70% 60%",
    icon: "craft",
  },
  {
    href: "/compositions/library",
    title: "Group Builds",
    scene: "composition",
    at: "50% 40%",
    icon: "composition",
  },
  { href: "/items", title: "Item Database", scene: "city", at: "12% 38%", icon: "catalog" },
  { href: "/groups", title: "Teams", scene: "city", at: "88% 55%", icon: "guild" },
] as const;
const toolCopy: Record<string, string> = {
  "/tools/market": "Sell and buy orders for every city, with the time each one was seen.",
  "/builds/library": "Equipment, abilities and swaps for every weapon, ready to copy.",
  "/tools/crafting": "Cost a run with your specs, focus, fees and observed prices.",
  "/compositions/library": "Party plans with every member's loadout and the optional roles.",
  "/items": "Every item's stats, abilities, recipes, tiers and current prices.",
  "/groups": "A workspace for your team: events, shared builds, comps and loot splits.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const params = await searchParams;
  const region = regionSchema
    .catch("europe")
    .parse(params.region || (await cookies()).get("atlas-region")?.value);
  const suffix = `?region=${region}`;
  const builds = (await featuredLibraryBuilds()).slice(0, 6);
  const library = await libraryCounts();
  const n = (value: number) => value.toLocaleString("en-US");
  const gameData = gameDataSource.charAt(0).toLowerCase() + gameDataSource.slice(1);
  return (
    <div className="home-landing">
      <section className="landing-hero" aria-labelledby="home-title">
        <picture className="landing-hero-art" aria-hidden="true">
          <source
            media="(max-width: 700px)"
            srcSet="/albion/illustrations/city-overlook-v2-phone.webp"
          />
          <img
            src="/albion/illustrations/city-overlook-v2.webp"
            alt=""
            width={1800}
            height={772}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Independent Albion Online tools</p>
          <h1 id="home-title">
            Your Albion
            <br />
            <em>advantage.</em>
          </h1>
          <p className="landing-lede">
            Market prices, {n(library.builds)} builds and {tools.length} calculators, built on real
            player observations. Make your next move count.
          </p>
          <div className="landing-actions">
            <Link href={`/tools/market${suffix}`} className="button primary">
              <Search size={18} /> Explore Market <ArrowRight size={17} />
            </Link>
            <Link href={`/builds/library${suffix}`} className="button secondary">
              <BookOpen size={18} /> Browse Builds
            </Link>
          </div>
          <ul className="landing-benefits" aria-label="What Outpost does">
            <li>
              <ChartNoAxesCombined size={22} aria-hidden="true" />
              <div>
                <strong>Market data</strong>
                <span>Live and historical prices across every city</span>
              </div>
            </li>
            <li>
              <Swords size={22} aria-hidden="true" />
              <div>
                <strong>Build planning</strong>
                <span>Loadouts, abilities and swaps for any content</span>
              </div>
            </li>
            <li>
              <Users size={22} aria-hidden="true" />
              <div>
                <strong>Group coordination</strong>
                <span>Comps, Teams and loot splits in one place</span>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="landing-tools" aria-labelledby="home-tools-title">
        <div className="landing-section-heading">
          <h2 id="home-tools-title">Tools</h2>
          <p>Everything you need to make better decisions in Albion Online.</p>
          <Link className="text-link" href={`/tools${suffix}`}>
            All {tools.length} tools <ArrowRight size={15} />
          </Link>
        </div>
        <div className="landing-tool-grid">
          {toolTiles.map((tile) => (
            <Link
              key={tile.href}
              href={`${tile.href}${suffix}`}
              className="landing-tool-tile"
              data-scene={tile.scene}
              style={{ "--scene-at": tile.at } as React.CSSProperties}
            >
              <span className="landing-tile-art" aria-hidden="true" />
              <span className="landing-tile-body">
                <span className="landing-tile-icon">
                  <ToolIcon name={tile.icon} size={20} />
                </span>
                <strong>{tile.title}</strong>
                <span>{toolCopy[tile.href]}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-builds" aria-labelledby="home-builds-title">
        <div className="landing-section-heading">
          <h2 id="home-builds-title">Builds</h2>
          <p>
            {n(library.builds)} loadouts from the library, with abilities, swaps and the silver to
            gear up.
          </p>
          <Link className="text-link" href={`/builds/library${suffix}`}>
            Browse all builds <ArrowRight size={15} />
          </Link>
        </div>
        <div className="landing-build-grid">
          {builds.map((build) => {
            const main = build.equipment.find((item) => item.slot === "Main hand");
            return (
              <Link
                key={build.id}
                href={`/builds/library/${encodeURIComponent(build.slug)}${suffix}`}
                className="landing-build-tile"
              >
                <span className="landing-build-art" aria-hidden="true">
                  {main ? <ItemIcon id={main.itemId} size={88} /> : null}
                </span>
                <span className="landing-build-body">
                  <strong>{build.title}</strong>
                  <span className="landing-chips">
                    <span className="landing-chip">{activityName(build.category)}</span>
                    {build.weaponName && (
                      <span className="landing-chip is-muted">{build.weaponName}</span>
                    )}
                  </span>
                  <span className="landing-build-meta">
                    <span>By {build.author}</span>
                    <time dateTime={build.updatedAt}>{build.updatedAt.slice(0, 10)}</time>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="landing-band" aria-labelledby="home-band-title">
        <div className="landing-band-copy">
          <h2 id="home-band-title">Built for Albion players</h2>
          <p>
            Independent and free. Prices are player observations from the Albion Online Data Project
            with their own source times; recipes and stats use {gameData}. Nothing is estimated or
            made up.
          </p>
          <div className="landing-actions">
            <Link href={`/tools/market${suffix}`} className="button primary">
              Explore Market <ArrowRight size={17} />
            </Link>
            <Link href={`/guides${suffix}`} className="button secondary">
              Read the guides
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
