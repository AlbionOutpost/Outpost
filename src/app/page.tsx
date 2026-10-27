import "./homepage.css";
import { db } from "@/lib/db";
import { HomeMarketSearch } from "@/components/home-player-preview";
import { ItemIcon } from "@/components/item-icon";
import { HomeMarketTerminal } from "@/components/home-market-terminal";
import { HomeEquipmentShowcase } from "@/components/home-equipment-showcase";
import { HomeMarketPulse } from "@/components/home-market-pulse";
import { HomeBuildCard } from "@/components/home-build-card";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeatureEmblem } from "@/components/feature-emblem";
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
  const builds = await db.build
    .findMany({
      where: {
        visibility: "PUBLIC",
        hiddenAt: null,
        // Reserved by isolated browser fixtures; never promote these as community activity.
        NOT: { authorId: { startsWith: "atlas-test-" } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        contentType: true,
        version: true,
        equipment: { select: { slot: true, itemId: true, quality: true } },
        author: { select: { name: true } },
      },
    })
    .catch(() => null);
  const suffix = `?region=${region}`;
  const features = [
    {
      title: "Market tools",
      kind: "market" as const,
      description: "Find city prices and check buy and sell orders.",
      action: "Open market",
      href: `/tools/market${suffix}`,
    },
    {
      title: "Build creator",
      kind: "build" as const,
      description: "Pick your gear, abilities and swaps. Save your next set.",
      action: "Create a build",
      href: `/builds/new${suffix}`,
    },
    {
      title: "Calculators",
      kind: "calculator" as const,
      description: "Check material costs, resource returns and profit.",
      action: "Browse calculators",
      href: `/tools${suffix}`,
    },
    {
      title: "Guild tools",
      kind: "guild" as const,
      description: "Plan guild events and keep your group organised.",
      action: "Find your guild",
      href: `/groups${suffix}`,
    },
  ];
  return (
    <div className="outpost-home-hub homepage-polish">
      <section className="outpost-hero">
        <div className="hero-inner">
          <span className="hero-kicker">THE ALBION ONLINE COMPANION</span>
          <h1>
            <span>Plan. Trade. Build.</span>
            <em>Play smarter.</em>
          </h1>
          <p className="hero-description">
            Compare city prices, calculate your costs and put your next set together. Your Albion
            tools, in one place.
          </p>
          <div className="actions hero-actions">
            <Link className="button primary" href={`/tools/market${suffix}`}>
              Explore market <ArrowRight size={16} />
            </Link>
            <Link className="button secondary" href={`/builds/new${suffix}`}>
              Create a build <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <HomeEquipmentShowcase />
      </section>
      <div className="landing-content">
        <section className="featured-section" aria-label="Explore Outpost tools">
          <div className="featured-tools">
            {features.map((feature) => (
              <Link className="featured-tool" key={feature.title} href={feature.href}>
                <FeatureEmblem kind={feature.kind} />
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>
                <span className="feature-action">
                  {feature.action}
                  <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <HomeMarketPulse />
        <div className="home-hub-workspace">
          <HomeMarketTerminal />
          <section className="market-desk" aria-labelledby="desk-title">
            <div className="home-market-heading">
              <ItemIcon id="T4_BAG" size={48} />
              <div>
                <h2 id="desk-title">What’s it worth?</h2>
                <p>Check observed prices before you buy or sell.</p>
              </div>
              <Link className="text-link" href={`/tools/market${suffix}`}>
                Full market explorer <ArrowRight size={16} />
              </Link>
            </div>
            <HomeMarketSearch />
          </section>
        </div>
        <section className="home-community-builds" aria-labelledby="community-heading">
          <div className="section-heading">
            <h2 id="community-heading">COMMUNITY BUILDS</h2>
            <Link className="text-link" href={`/builds${suffix}`}>
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {builds && builds.length > 2 && (
            <p className="homepage-build-scroll-hint">Scroll to see more loadouts.</p>
          )}
          {builds?.length ? (
            <div
              className="homepage-build-strip"
              role="region"
              aria-label="Recent public builds"
              tabIndex={0}
            >
              {builds.map((build) => (
                <HomeBuildCard key={build.id} build={build} />
              ))}
            </div>
          ) : (
            <div className="homepage-build-empty">
              <p>
                {builds === null
                  ? "Community loadouts are temporarily unavailable."
                  : "No public loadouts yet. Create the first build for your group."}
              </p>
              <Link className="text-link" href={`/builds/new${suffix}`}>
                Create a build →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
