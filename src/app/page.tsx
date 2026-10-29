import "./homepage.css";
import { HomeMarketTerminal } from "@/components/home-market-terminal";
import { ItemIcon } from "@/components/item-icon";
import { equipmentName } from "@/lib/albion/equipment-catalog";
import { LibraryBuildCard } from "@/components/library-build-card";
import { featuredLibraryBuilds } from "@/lib/grind-library";
import { cookies } from "next/headers";
import Link from "@/components/link";
import {
  ArrowRight,
  ChartNoAxesCombined,
  Swords,
  Users,
  Shield,
  HeartPulse,
  Search,
  BookOpen,
  MoveRight,
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
  const featured = (
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
  );
  return (
    <div className="reference-home support-home home-cinematic">
      <HomeMarketTerminal
        afterPreview={featured}
        hero={
          <div className="reference-hero-copy">
            <h1 id="home-title">
              Your Albion
              <br />
              <em>advantage.</em>
            </h1>
            <p>Markets, builds and group planning for Albion Online. Make your next move count.</p>
            <div className="actions">
              <Link href={`/tools/market${suffix}`} className="button primary">
                <Search size={18} /> Explore Market <ArrowRight size={17} />
              </Link>
              <Link href={`/builds/library${suffix}`} className="button secondary">
                <BookOpen size={18} /> Browse Builds
              </Link>
            </div>
          </div>
        }
      >
        <section className="home-next-actions" aria-labelledby="home-next-title">
          <h2 id="home-next-title" className="sr-only">
            Choose your next task
          </h2>
          <div className="reference-feature-grid">
            <article className="home-destination home-destination-market">
              <ChartNoAxesCombined size={25} />
              <h3>Market Explorer</h3>
              <p>Compare city prices. Spot the spread. Plan your next trade.</p>
              <div className="destination-market-preview" aria-hidden="true">
                <span>
                  <ItemIcon id="T4_BAG" size={64} />
                </span>
                <span>
                  <ItemIcon id="T4_MAIN_AXE" size={52} />
                </span>
                <MoveRight size={26} />
              </div>
              <Link className="text-link" href={`/tools/market${suffix}`}>
                Open Market Explorer <ArrowRight size={15} />
              </Link>
            </article>
            <article className="home-destination home-destination-builds">
              <Swords size={25} />
              <h3>Build Library</h3>
              <p>Find your playstyle with equipment, abilities and swaps in one place.</p>
              {builds[0] && (
                <div
                  className="home-feature-equipment"
                  aria-label={`Equipment from ${builds[0].title}`}
                >
                  {builds[0].equipment
                    .filter((item) =>
                      ["Main hand", "Helmet", "Chest", "Boots", "Cape", "Off hand"].includes(
                        item.slot,
                      ),
                    )
                    .slice(0, 6)
                    .map((item) => (
                      <span key={item.slot} title={equipmentName(item.itemId)}>
                        <ItemIcon id={item.itemId} size={40} />
                      </span>
                    ))}
                </div>
              )}
              <Link className="text-link" href={`/builds/library${suffix}`}>
                Browse builds <ArrowRight size={15} />
              </Link>
            </article>
            <article className="home-destination home-destination-comps">
              <Users size={25} />
              <h3>Composition Planner</h3>
              <p>A stronger party starts with a plan. Bring roles, loadouts and swaps together.</p>
              <div
                className="destination-party-preview"
                aria-label="Plan frontline, damage and support roles"
              >
                <span title="Frontline">
                  <Shield size={23} />
                </span>
                <span title="Damage">
                  <Swords size={23} />
                </span>
                <span title="Support">
                  <HeartPulse size={23} />
                </span>
              </div>
              <Link className="text-link" href={`/compositions/new${suffix}`}>
                Plan a composition <ArrowRight size={15} />
              </Link>
            </article>
          </div>
        </section>
      </HomeMarketTerminal>
    </div>
  );
}
