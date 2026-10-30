import "./homepage.css";
import Image from "next/image";
import { LibraryBuildCard } from "@/components/library-build-card";
import { featuredLibraryBuilds, libraryCounts } from "@/lib/grind-library";
import { gameDataSource } from "@/lib/albion/game/recipes";
import { tools } from "@/lib/tool-directory";
import { cookies } from "next/headers";
import Link from "@/components/link";
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Calculator,
  Database,
  Search,
  ShieldCheck,
  Swords,
  Users,
} from "lucide-react";
import { regionSchema } from "@/lib/albion/region-config";

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
  const builds = (await featuredLibraryBuilds()).slice(0, 4);
  const library = await libraryCounts();
  const counts = {
    builds: library.builds,
    comps: library.compositions,
    guides: library.guides,
    tools: tools.length,
  };
  const n = (value: number) => value.toLocaleString("en-US");
  return (
    <div className="reference-home support-home home-cinematic home-launch">
      <section className="reference-hero" aria-labelledby="home-title">
        <div className="reference-hero-copy">
          <h1 id="home-title">
            Your Albion
            <br />
            <em>advantage.</em>
          </h1>
          <p>
            Market prices, {n(counts.builds)} builds and {counts.tools} calculators for Albion
            Online, built on real player observations. Make your next move count.
          </p>
          <div className="actions">
            <Link href={`/tools/market${suffix}`} className="button primary">
              <Search size={18} /> Explore Market <ArrowRight size={17} />
            </Link>
            <Link href={`/builds/library${suffix}`} className="button secondary">
              <BookOpen size={18} /> Browse Builds
            </Link>
          </div>
        </div>
        <div className="home-hero-atmosphere" aria-hidden="true">
          {/* The hero is the largest paint; phones get the 800px (33 KB) version. */}
          <picture>
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
        </div>
      </section>

      <section className="home-benefits" aria-labelledby="home-benefits-title">
        <h2 id="home-benefits-title" className="sr-only">
          What Outpost does
        </h2>
        <div className="reference-feature-grid">
          <article className="home-destination home-destination-market">
            <ChartNoAxesCombined size={25} aria-hidden="true" />
            <h3>Know the price before you travel</h3>
            <p>
              Sell and buy orders for every city, with the time each one was seen, plus 30-day
              history and quality coverage for any item.
            </p>
            <Link className="text-link" href={`/tools/market${suffix}`}>
              Open Market Explorer <ArrowRight size={15} />
            </Link>
          </article>
          <article className="home-destination home-destination-builds">
            <Swords size={25} aria-hidden="true" />
            <h3>Find a loadout that works</h3>
            <p>
              {n(counts.builds)} library builds and {n(counts.comps)} group comps with equipment,
              abilities, swaps and the silver it takes to gear up.
            </p>
            <Link className="text-link" href={`/builds/library${suffix}`}>
              Browse builds <ArrowRight size={15} />
            </Link>
          </article>
          <article className="home-destination home-destination-comps">
            <Calculator size={25} aria-hidden="true" />
            <h3>Craft, refine and haul for profit</h3>
            <p>
              {counts.tools} calculators for crafting, refining, transport, flipping, farming and
              laborers, with your specs, focus and fees applied.
            </p>
            <Link className="text-link" href={`/tools${suffix}`}>
              See all tools <ArrowRight size={15} />
            </Link>
          </article>
        </div>
      </section>

      <section className="home-demo" aria-labelledby="home-demo-title">
        <div className="support-section-heading">
          <div>
            <h2 id="home-demo-title">The Market Explorer, as it runs today</h2>
            <p>
              Every quote keeps its city, quality and source time. Stale observations are marked,
              missing ones stay missing.
            </p>
          </div>
          <Link className="text-link" href={`/tools/market?item=T4_BAG&region=${region}`}>
            Try it with a T4 Bag <ArrowRight size={15} />
          </Link>
        </div>
        <figure className="home-demo-figure">
          <Image
            src="/home/market-explorer.webp"
            alt="Market Explorer showing sell and buy orders for a Tier 4 Bag across eight cities, each with its own source time"
            width={1600}
            height={958}
            unoptimized
            loading="lazy"
          />
          <figcaption>
            Screenshot of albionoutpost.com on 30 Oct 2026 · Europe server · Albion Online Data
            Project observations
          </figcaption>
        </figure>
        <div className="home-demo-secondary">
          <figure className="home-demo-figure">
            <Image
              src="/home/build-detail.webp"
              alt="Build detail page for a Battleaxe mist build showing the equipped slots and selected abilities"
              width={1600}
              height={958}
              unoptimized
              loading="lazy"
            />
            <figcaption>
              Build pages: slots, abilities, alternatives and loadout cost.{" "}
              <Link className="text-link" href={`/builds/library/battleaxe-mist-build${suffix}`}>
                Open this build
              </Link>
            </figcaption>
          </figure>
          <figure className="home-demo-figure">
            <Image
              src="/home/crafting-calculator.webp"
              alt="Crafting calculator with recipe configuration, priced materials and a results summary"
              width={1600}
              height={958}
              unoptimized
              loading="lazy"
            />
            <figcaption>
              Calculators: configure, price, understand the result.{" "}
              <Link className="text-link" href={`/tools/crafting${suffix}`}>
                Open the crafting calculator
              </Link>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="home-library-picks" aria-labelledby="home-builds-title">
        <div className="support-section-heading">
          <div>
            <h2 id="home-builds-title">Featured builds</h2>
            <p>Find your next playstyle.</p>
          </div>
          <Link className="text-link" href={`/builds/library${suffix}`}>
            Browse all builds <ArrowRight size={15} />
          </Link>
        </div>
        <div className="home-build-grid">
          {builds.map((build) => (
            <LibraryBuildCard key={build.id} build={build} />
          ))}
        </div>
      </section>

      <section className="home-trust" aria-labelledby="home-trust-title">
        <h2 id="home-trust-title">Where the numbers come from</h2>
        <ul className="home-trust-grid">
          <li>
            <Database size={20} aria-hidden="true" />
            <h3>Player-observed prices</h3>
            <p>
              Market quotes come from the Albion Online Data Project, collected by players who run
              its client. Every quote shows its own source time; nothing is estimated or filled in.
            </p>
          </li>
          <li>
            <ShieldCheck size={20} aria-hidden="true" />
            <h3>Game data, dated</h3>
            <p>
              Recipes, item weights, mount capacity and laborer tables use{" "}
              {gameDataSource.charAt(0).toLowerCase() + gameDataSource.slice(1)}. We say so on every
              page that uses them, and re-check after each patch.
            </p>
          </li>
          <li>
            <Users size={20} aria-hidden="true" />
            <h3>Free, with optional sign-in</h3>
            <p>
              Every tool works without an account. Discord sign-in only adds saved scenarios,
              favourites and Teams; we ask for your identity and email, nothing else.
            </p>
          </li>
        </ul>
        <p className="home-trust-links">
          <Link className="text-link" href={`/market-data${suffix}`}>
            How market coverage works
          </Link>
          <Link className="text-link" href={`/guides${suffix}`}>
            {counts.guides} guides
          </Link>
          <Link className="text-link" href={`/legal${suffix}`}>
            Privacy &amp; terms
          </Link>
        </p>
      </section>

      <section className="home-final-cta" aria-labelledby="home-cta-title">
        <div>
          <h2 id="home-cta-title">Make your next move count.</h2>
          <p>Start with a price check or a build. Save your plans whenever you are ready.</p>
        </div>
        <div className="actions">
          <Link href={`/tools/market${suffix}`} className="button primary">
            Explore Market <ArrowRight size={17} />
          </Link>
          <Link href={`/builds/library${suffix}`} className="button secondary">
            Browse Builds
          </Link>
        </div>
      </section>
    </div>
  );
}
