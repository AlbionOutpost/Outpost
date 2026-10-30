import "./homepage.css";
import { BuildPreview } from "@/components/landing/build-preview";
import { CraftingPreview } from "@/components/landing/crafting-preview";
import { GoldTicker } from "@/components/landing/gold-ticker";
import { GroupPreview } from "@/components/landing/group-preview";
import { MarketPreview } from "@/components/landing/market-preview";
import { PreviewShell } from "@/components/landing/preview-shell";
import {
  featuredLibraryBuilds,
  findLibraryBuild,
  findLibraryBuilds,
  findLibraryComposition,
  libraryCounts,
  librarySpellNames,
} from "@/lib/grind-library";
import { gameDataSource, itemName } from "@/lib/albion/game/recipes";
import { tools } from "@/lib/tool-directory";
import { cookies } from "next/headers";
import Link from "@/components/link";
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Compass,
  Database,
  ShieldCheck,
  Swords,
  Users,
} from "lucide-react";
import { regionSchema } from "@/lib/albion/region-config";

// One editorial thread runs through the previews: the bar you buy, the axe you craft from it
// and the build that carries it. All three come from live observations or the public library.
const showcase = {
  market: {
    id: "T6_METALBAR",
    cities: ["Bridgewatch", "Caerleon", "Martlock"],
    trend: "Bridgewatch",
  },
  crafting: { recipeId: "battleaxe-t6", output: "T6_MAIN_AXE", city: "Bridgewatch" },
  build: "battleaxe-mist-build",
  composition: "statics-group-builds",
} as const;

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
  // Two round trips to the library on Cloudflare: everything independent first, then the
  // composition's members, so the page streams without showing the shell fallback.
  const [library, spellNames, featured, composition] = await Promise.all([
    libraryCounts(),
    librarySpellNames(),
    findLibraryBuild(showcase.build),
    findLibraryComposition(showcase.composition),
  ]);
  const [fallback, members] = await Promise.all([
    featured ? Promise.resolve([]) : featuredLibraryBuilds(),
    composition ? findLibraryBuilds(composition.members) : Promise.resolve([]),
  ]);
  const build = featured ?? fallback[0];
  const n = (value: number) => value.toLocaleString("en-US");
  const gameData = gameDataSource.charAt(0).toLowerCase() + gameDataSource.slice(1);
  return (
    <div className="home-landing">
      <section className="landing-hero" aria-labelledby="home-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Independent Albion Online tools</p>
          <h1 id="home-title">
            Your Albion
            <br />
            <em>advantage.</em>
          </h1>
          <p className="landing-lede">
            Market prices, crafting math and {n(library.builds)} player builds in one place, built
            on real observations with their source times. Make your next move count.
          </p>
          <div className="landing-actions">
            <Link href={`/tools${suffix}`} className="button primary">
              Explore Tools <ArrowRight size={17} />
            </Link>
            <Link href={`/builds/library${suffix}`} className="button secondary">
              <BookOpen size={17} /> Browse Builds
            </Link>
          </div>
        </div>
        <div className="landing-hero-visual">
          <picture className="landing-hero-art">
            <source media="(max-width: 700px)" srcSet="/albion/illustrations/hero-v1-phone.webp" />
            <img
              src="/albion/illustrations/hero-v1.webp"
              alt="A market square at dusk, with stalls, banners and travellers around a statue"
              width={1600}
              height={900}
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <GoldTicker />
        </div>
      </section>

      <ul className="landing-benefits" aria-label="What Outpost does">
        <li>
          <ChartNoAxesCombined size={20} aria-hidden="true" />
          <div>
            <strong>Real market data</strong>
            <span>Sell and buy orders for every city, each with the time it was seen.</span>
          </div>
        </li>
        <li>
          <Swords size={20} aria-hidden="true" />
          <div>
            <strong>Build planning</strong>
            <span>Loadouts, abilities and swaps for every weapon, with the silver to gear up.</span>
          </div>
        </li>
        <li>
          <Users size={20} aria-hidden="true" />
          <div>
            <strong>Group coordination</strong>
            <span>
              Comps, Teams and loot splits, with every member&apos;s loadout in one place.
            </span>
          </div>
        </li>
        <li>
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <strong>Independent and free</strong>
            <span>No account needed to browse. Nothing is estimated or made up.</span>
          </div>
        </li>
      </ul>

      <section className="landing-showcase" aria-labelledby="home-showcase-title">
        <div className="landing-section-heading">
          <p className="landing-kicker">The tools</p>
          <h2 id="home-showcase-title">Powerful tools for every Albion player.</h2>
          <p>
            Live software, not illustrations: each window below runs on the same data as the tool it
            opens.
          </p>
          <Link className="text-link" href={`/tools${suffix}`}>
            All {tools.length} tools <ArrowRight size={15} />
          </Link>
        </div>
        <div className="landing-showcase-grid">
          <PreviewShell
            id="home-market"
            tone="lead"
            eyebrow="Market Explorer"
            title="Compare cities before you travel"
            description="Current orders in three cities and the recorded 30-day trend for one of them."
            href={`/tools/market?item=${showcase.market.id}&quality=1&region=${region}`}
            action="Explore Market"
          >
            <MarketPreview
              item={{ id: showcase.market.id, name: itemName(showcase.market.id), tier: "Tier 6" }}
              cities={showcase.market.cities}
              trendCity={showcase.market.trend}
            />
          </PreviewShell>
          <PreviewShell
            id="home-build"
            eyebrow="Build Library"
            title="Copy a loadout, then make it yours"
            description="Every build keeps its equipment, recorded abilities and swaps, ready to price and edit."
            href={`/builds/library/${encodeURIComponent(build.slug)}${suffix}`}
            action="Open Build"
          >
            <BuildPreview build={build} spellNames={spellNames} />
          </PreviewShell>
          <PreviewShell
            id="home-crafting"
            eyebrow="Crafting Calculator"
            title="Know the margin before you craft"
            description="Materials, fees and returns against current orders, with every assumption in view."
            href={`/tools/crafting?recipe=${showcase.crafting.recipeId}&region=${region}`}
            action="Open Calculator"
          >
            <CraftingPreview
              recipeId={showcase.crafting.recipeId}
              outputName={itemName(showcase.crafting.output)}
              city={showcase.crafting.city}
            />
          </PreviewShell>
        </div>
      </section>

      <section className="landing-group" aria-labelledby="home-group-title">
        <div className="landing-group-copy">
          <p className="landing-kicker">Group Builds</p>
          <h2 id="home-group-title">Plan the whole party, not just your own kit.</h2>
          <p>
            {n(library.compositions)} public group builds list every member&apos;s loadout and which
            slots are optional. Copy one into your own composition, assign roles and players, and
            share it with your Team.
          </p>
          <div className="landing-actions">
            <Link href={`/compositions/library${suffix}`} className="button primary">
              Open Compositions <ArrowRight size={17} />
            </Link>
            <Link href={`/groups${suffix}`} className="button secondary">
              <Users size={17} /> Teams
            </Link>
          </div>
        </div>
        {composition && (
          <div className="landing-preview-window landing-group-window">
            <GroupPreview composition={composition} members={members} suffix={suffix} />
          </div>
        )}
      </section>

      <section className="landing-trust" aria-labelledby="home-trust-title">
        <div className="landing-section-heading">
          <p className="landing-kicker">Why Outpost</p>
          <h2 id="home-trust-title">Numbers you can act on.</h2>
        </div>
        <ul className="landing-trust-grid">
          <li>
            <Database size={20} aria-hidden="true" />
            <strong>Observed, not estimated</strong>
            <span>
              Prices are player observations from the Albion Online Data Project. Every quote keeps
              its city, quality and source time, and a missing price stays missing.
            </span>
          </li>
          <li>
            <Compass size={20} aria-hidden="true" />
            <strong>Current game data</strong>
            <span>
              Items, recipes, stats and abilities come from {gameData}, with the official item
              renders.
            </span>
          </li>
          <li>
            <Swords size={20} aria-hidden="true" />
            <strong>A living library</strong>
            <span>
              {n(library.builds)} builds, {n(library.compositions)} group builds and{" "}
              {n(library.guides)} guides by players, each with its author and date.
            </span>
          </li>
          <li>
            <ShieldCheck size={20} aria-hidden="true" />
            <strong>Yours stays yours</strong>
            <span>
              Private builds, comps and Team pages are checked on the server for every request. Sign
              in with Discord; nothing else is asked of you.
            </span>
          </li>
        </ul>
      </section>

      <section className="landing-cta" aria-labelledby="home-cta-title">
        <h2 id="home-cta-title">Make better decisions in Albion Online.</h2>
        <p>Browse everything without an account, or sign in to save builds and run a Team.</p>
        <div className="landing-actions">
          <Link href={`/signin${suffix}`} className="button primary">
            Create account <ArrowRight size={17} />
          </Link>
          <Link href={`/tools${suffix}`} className="button secondary">
            Explore without an account
          </Link>
        </div>
      </section>
    </div>
  );
}
