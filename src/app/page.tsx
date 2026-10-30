import "./homepage.css";
import { AdSlot } from "@/components/ad-slot";
import { CraftingPreview } from "@/components/landing/crafting-preview";
import { GoldTicker } from "@/components/landing/gold-ticker";
import { GroupParty } from "@/components/landing/group-party";
import { MarketPreview } from "@/components/landing/market-preview";
import { PreviewShell } from "@/components/landing/preview-shell";
import { ItemIcon } from "@/components/item-icon";
import { LoadoutBoard } from "@/components/loadout-board";
import {
  featuredLibraryBuilds,
  findLibraryBuild,
  findLibraryBuilds,
  findLibraryComposition,
  libraryCounts,
  librarySpellNames,
} from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { gameDataSource, itemName } from "@/lib/albion/game/recipes";
import { regions, regionSchema } from "@/lib/albion/region-config";
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

// One editorial thread runs through the page: the bar you buy, the axe you craft from it,
// the build that carries it and the party it fights in. Everything comes from live
// observations or the public library; nothing is staged.
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

/** Official renders used as the capability visuals; all are real, current items. */
const capabilityArt = {
  market: ["T6_METALBAR", "T6_PLANKS", "T6_LEATHER"],
  builds: ["T8_MAIN_AXE", "T8_ARMOR_LEATHER_FEY", "T8_SHOES_PLATE_SET1"],
  groups: ["T8_2H_HOLYSTAFF", "T8_2H_HAMMER", "T8_2H_BOW"],
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
  const buildHref = `/builds/library/${encodeURIComponent(build.slug)}${suffix}`;
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
            Live prices, crafting math and {n(library.builds)} player builds, built on real
            observations. Make your next move count.
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
        <div className="landing-hero-build">
          <div className="landing-hero-build-head">
            <div>
              <strong>{build.title}</strong>
              <small>
                {activityName(build.category)} · {build.weaponName} · by {build.author}
                {build.upvotes ? ` · ▲ ${n(build.upvotes)}` : ""}
              </small>
            </div>
            <Link href={buildHref} className="landing-hero-build-open">
              Open build <ArrowRight size={15} />
            </Link>
          </div>
          <LoadoutBoard pieces={build.equipment} spellNames={spellNames} size="hero" />
          <div className="landing-hero-build-foot">
            <GoldTicker />
          </div>
        </div>
      </section>

      <ul className="landing-benefits" aria-label="What Outpost does">
        <li>
          <span className="landing-benefit-art" aria-hidden="true">
            {capabilityArt.market.map((id) => (
              <ItemIcon key={id} id={id} size={44} />
            ))}
          </span>
          <ChartNoAxesCombined size={18} aria-hidden="true" />
          <strong>Real market data</strong>
          <span>Every city, every order, with the time it was seen.</span>
        </li>
        <li>
          <span className="landing-benefit-art" aria-hidden="true">
            {capabilityArt.builds.map((id) => (
              <ItemIcon key={id} id={id} size={44} />
            ))}
          </span>
          <Swords size={18} aria-hidden="true" />
          <strong>Build planning</strong>
          <span>Loadouts, abilities and swaps, priced to gear up.</span>
        </li>
        <li>
          <span className="landing-benefit-art" aria-hidden="true">
            {capabilityArt.groups.map((id) => (
              <ItemIcon key={id} id={id} size={44} />
            ))}
          </span>
          <Users size={18} aria-hidden="true" />
          <strong>Group coordination</strong>
          <span>Comps, Teams and loot splits in one place.</span>
        </li>
        <li>
          <span className="landing-benefit-art is-mark" aria-hidden="true">
            <ShieldCheck size={40} />
          </span>
          <ShieldCheck size={18} aria-hidden="true" />
          <strong>Independent and free</strong>
          <span>No account to browse. Nothing estimated or made up.</span>
        </li>
      </ul>

      <section className="landing-showcase" aria-labelledby="home-showcase-title">
        <div className="landing-section-heading">
          <p className="landing-kicker">The tools</p>
          <h2 id="home-showcase-title">Powerful tools for every Albion player.</h2>
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
            href={`/tools/market?item=${showcase.market.id}&quality=1&region=${region}`}
            action="Explore Market"
            note={`Albion Online Data Project · ${regions[region].label}`}
          >
            <MarketPreview
              item={{ id: showcase.market.id, name: itemName(showcase.market.id), tier: "Tier 6" }}
              cities={showcase.market.cities}
              trendCity={showcase.market.trend}
            />
          </PreviewShell>
          <PreviewShell
            id="home-crafting"
            eyebrow="Crafting Calculator"
            title="Know the margin before you craft"
            href={`/tools/crafting?recipe=${showcase.crafting.recipeId}&region=${region}`}
            action="Open Calculator"
            note="Same formulas as the calculator"
          >
            <CraftingPreview
              recipeId={showcase.crafting.recipeId}
              outputName={itemName(showcase.crafting.output)}
              city={showcase.crafting.city}
            />
          </PreviewShell>
          {composition && (
            <PreviewShell
              id="home-group"
              className="is-wide"
              eyebrow="Group Builds"
              title="Plan the whole party, not just your own kit"
              href={`/compositions/library/${encodeURIComponent(composition.slug)}${suffix}`}
              action="Open Group Build"
              note={`${n(library.compositions)} public group builds · copy one and assign roles`}
            >
              <GroupParty composition={composition} members={members} suffix={suffix} />
            </PreviewShell>
          )}
        </div>
      </section>

      <AdSlot slot="0000000000" suffix={suffix} />

      <section className="landing-trust" aria-labelledby="home-trust-title">
        <div className="landing-section-heading">
          <p className="landing-kicker">Why Outpost</p>
          <h2 id="home-trust-title">Numbers you can act on.</h2>
        </div>
        <ul className="landing-trust-grid">
          <li data-scene="market">
            <Database size={20} aria-hidden="true" />
            <strong>Observed, not estimated</strong>
            <span>
              Player observations from the Albion Online Data Project, each with its city, quality
              and source time.
            </span>
          </li>
          <li data-scene="hero">
            <Compass size={20} aria-hidden="true" />
            <strong>Current game data</strong>
            <span>Items, recipes and abilities from {gameData}, with official renders.</span>
          </li>
          <li data-scene="build">
            <Swords size={20} aria-hidden="true" />
            <strong>A living library</strong>
            <span>
              {n(library.builds)} builds, {n(library.compositions)} group builds and{" "}
              {n(library.guides)} guides by players, each with author and date.
            </span>
          </li>
          <li data-scene="composition">
            <ShieldCheck size={20} aria-hidden="true" />
            <strong>Yours stays yours</strong>
            <span>Private builds, comps and Teams are checked on the server, every request.</span>
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
