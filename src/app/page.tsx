import "./homepage.css";
import { AdSlot } from "@/components/ad-slot";
import { CraftCard } from "@/components/landing/craft-card";
import { GuidesCarousel } from "@/components/landing/guides-carousel";
import { MarketCard } from "@/components/landing/market-card";
import { PlannerCard } from "@/components/landing/planner-card";
import { PreviewShell } from "@/components/landing/preview-shell";
import { TopKills } from "@/components/landing/top-kills";
import { ActivityGrid } from "@/components/landing/activity-grid";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LandingWindows } from "@/components/landing/windows";
import {
  featuredLibraryBuilds,
  findLibraryBuilds,
  findLibraryComposition,
  libraryActivities,
  libraryCounts,
  libraryGuides,
  librarySpellNames,
} from "@/lib/grind-library";
import { billingEnabled } from "@/lib/billing/stripe";
import { supporterPrice } from "@/lib/billing/price";
import { readingMinutes } from "@/components/guide-cover-card";
import { itemName } from "@/lib/albion/game/recipes";
import { regionSchema, regions } from "@/lib/albion/region-config";
import { brandCopy } from "@/lib/brand-copy";
import { landingStats } from "@/lib/site-stats";
import { tools } from "@/lib/tool-directory";
import { cookies } from "next/headers";
import Link from "@/components/link";
import { DiscordMark } from "@/components/discord-mark";
import { ArrowRight, BookOpen } from "lucide-react";

// What the page shows is chosen here and read from the public library or live observations;
// nothing is staged. The build fills eight of the board's ten wells (no public build records a
// bag or mount), the comp is a five-member party, the planner plan is an example priced live.
const showcase = {
  build: "hallowfall-healer-zvz-build",
  comp: "hellgate-5v5-front-to-back",
  market: { id: "T6_METALBAR", kind: "Refined material · Tier 6" },
  plan: [
    { itemId: "T4_CAPE", slot: "Cape", qty: 10 },
    { itemId: "T6_MAIN_SWORD", slot: "Main hand", qty: 3 },
    { itemId: "T6_POTION_HEAL", slot: "Potion", qty: 20 },
  ],
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
  // comp's members, so the page streams without showing the shell fallback.
  const [library, spellNames, picked, comp, guides, players, activities, price] = await Promise.all(
    [
      libraryCounts(),
      librarySpellNames(),
      findLibraryBuilds([showcase.build]),
      findLibraryComposition(showcase.comp),
      libraryGuides(),
      landingStats(),
      libraryActivities(),
      supporterPrice(),
    ],
  );
  const billing = billingEnabled();
  const [fallback, members] = await Promise.all([
    picked.length ? Promise.resolve([]) : featuredLibraryBuilds(),
    comp ? findLibraryBuilds(comp.members) : Promise.resolve([]),
  ]);
  const build = picked[0] ?? fallback[0] ?? null;
  // Only the ability names the shown build uses travel to the client.
  const used = new Set(build?.equipment.flatMap((e) => e.skills) ?? []);
  const spellLabels = Object.fromEntries(
    [...used].flatMap((id) => (spellNames[id] ? [[id, spellNames[id]]] : [])),
  );
  const latestGuides = guides
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((g) => ({
      slug: g.slug,
      title: g.title,
      category: g.category,
      author: g.author,
      updatedAt: g.updatedAt,
      summary: brandCopy(g.summary),
      cover: g.cover,
      minutes: readingMinutes(g.content),
    }));
  const n = (value: number) => value.toLocaleString("en-US");
  // Measured counts only; the two account counts drop out if the database cannot answer.
  const stats = [
    ...(players ? [{ value: players.monthlyPlayers, label: "Active players" }] : []),
    { value: library.builds, label: "Builds" },
    { value: library.guides, label: "Guides" },
    { value: tools.length, label: "Tools" },
    ...(players ? [{ value: players.supporters, label: "Supporters" }] : []),
  ];
  return (
    <div className="home-landing">
      <LandingReveal />
      <section className="landing-hero" aria-labelledby="home-title">
        <div className="landing-wrap landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">Independent Albion Online tools</p>
            <h1 id="home-title">
              Your Albion
              <br />
              <em>advantage.</em>
            </h1>
            <p className="landing-lede">
              Live market prices, {n(library.builds)} builds and {tools.length} calculators, all
              from real player data. Know what to craft, what to wear and where to sell before you
              leave town.
            </p>
            <div className="landing-actions">
              <Link href={`/tools${suffix}`} className="button primary">
                Explore Tools <ArrowRight size={17} />
              </Link>
              <Link href={`/builds/library${suffix}`} className="button secondary">
                <BookOpen size={17} /> Browse Builds
              </Link>
            </div>
            <dl className="landing-stats" aria-label="Outpost in numbers">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{n(s.value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <div className="landing-wrap">
        <LandingWindows
          build={build}
          spellNames={spellLabels}
          comp={comp ?? null}
          members={members}
          suffix={suffix}
        />
      </div>

      <section className="landing-wrap landing-tools" aria-labelledby="home-tools-title">
        <div className="section-heading landing-section-heading">
          <h2 id="home-tools-title">
            The <em>tools</em> you actually use.
          </h2>
          <p>
            Check prices, work out if a craft is worth it and plan your shopping run. No more
            alt-tabbing between five sites.
          </p>
          <Link className="pill-link" href={`/tools${suffix}`}>
            View all tools <ArrowRight size={15} />
          </Link>
        </div>
        <div className="landing-card-grid">
          <PreviewShell
            id="home-market"
            emblem="tool-market"
            glyph="market"
            scene="market"
            title="Market Explorer"
            description="Prices in every city, so you know where to buy and where to dump."
            href={`/tools/market?item=${showcase.market.id}&quality=1&region=${region}`}
            action="Open Market Explorer"
          >
            <MarketCard
              item={{
                id: showcase.market.id,
                name: itemName(showcase.market.id),
                kind: showcase.market.kind,
              }}
            />
          </PreviewShell>
          <PreviewShell
            id="home-crafting"
            emblem="tool-craft"
            glyph="craft"
            scene="build"
            title="Crafting Calculator"
            description="See if a craft makes silver before you burn the mats."
            href={`/tools/crafting${suffix}`}
            action="Open Crafting Calculator"
          >
            <CraftCard />
          </PreviewShell>
          <PreviewShell
            id="home-planner"
            emblem="tool-planner"
            glyph="catalog"
            scene="city"
            title="Crafting Planner"
            description="List what you want to craft, tick off what you have, buy the rest."
            href={`/shopping-list${suffix}`}
            action="Open Crafting Planner"
          >
            <PlannerCard plan={[...showcase.plan]} />
          </PreviewShell>
        </div>
      </section>

      <section className="landing-wrap landing-activities" aria-labelledby="home-activities-title">
        <div className="section-heading landing-section-heading">
          <h2 id="home-activities-title">
            A build for <em>every</em> activity.
          </h2>
          <p>Pick your content and grab the builds other players liked most for it.</p>
          <Link className="pill-link" href={`/builds/library${suffix}`}>
            Build library <ArrowRight size={15} />
          </Link>
        </div>
        <ActivityGrid activities={activities} suffix={suffix} />
      </section>

      <TopKills suffix={suffix} serverName={`Albion ${regions[region].label}`} />

      <section className="landing-wrap landing-guides" aria-labelledby="home-guides-title">
        <div className="section-heading landing-section-heading">
          <h2 id="home-guides-title">
            Learn from <em>players</em>.
          </h2>
          <p>
            {library.guides} guides from players who know their stuff: progression, gathering, PvE
            and making silver.
          </p>
          <Link className="pill-link" href={`/guides${suffix}`}>
            All guides <ArrowRight size={15} />
          </Link>
        </div>
        <GuidesCarousel guides={latestGuides} suffix={suffix} />
      </section>

      <div className="landing-wrap">
        <AdSlot placement="hub" suffix={suffix} />
      </div>

      <section className="landing-wrap landing-cta-wrap" aria-labelledby="home-cta-title">
        <div className="raised has-scene landing-cta" data-scene="build">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/albion/icons/team-roles.webp" alt="" width={68} height={68} />
          <h2 id="home-cta-title">
            Free for everyone. <em>Supporters</em> keep it running.
          </h2>
          <p>
            Every tool, build and guide works without an account. Sign in with Discord to save your
            builds and comps; Supporters get no ads and a Team space for their guild
            {price && billing ? ` for ${price}` : ""}.
          </p>
          <div className="landing-cta-actions">
            <Link href={`/signin?callbackUrl=%2Fdashboard`} className="button primary">
              <DiscordMark /> Sign in with Discord
            </Link>
            <Link href={`/supporter${suffix}`} className="button secondary">
              {billing ? "Become a Supporter" : "About the Supporter plan"}
              {!billing ? <span className="landing-chip">Opening soon</span> : null}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
