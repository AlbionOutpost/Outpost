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
import { playerCount } from "@/lib/site-stats";
import { tools } from "@/lib/tool-directory";
import { cookies } from "next/headers";
import Link from "@/components/link";
import { ArrowRight, BookOpen, Check } from "lucide-react";

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
      playerCount(),
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
  const stats = [
    ...(players != null ? [{ value: players, label: "Players signed up" }] : []),
    { value: library.builds, label: "Public builds" },
    { value: library.compositions, label: "Group comps" },
    { value: tools.length, label: "Calculators" },
  ];
  return (
    <div className="home-landing">
      <LandingReveal />
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
        <div className="landing-wrap landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">Independent Albion Online tools</p>
            <h1 id="home-title">
              Your Albion
              <br />
              <em>advantage.</em>
            </h1>
            <p className="landing-lede">
              Market prices, {n(library.builds)} builds and {tools.length} calculators, built on
              real player observations. Plan, prepare and play smarter.
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

      <section className="landing-wrap landing-activities" aria-labelledby="home-activities-title">
        <div className="section-heading landing-section-heading">
          <h2 id="home-activities-title">
            A build for <em>every</em> activity.
          </h2>
          <p>
            Pick what you are about to do and start from the five builds players like most for it,
            ranked by likes.
          </p>
          <Link className="pill-link" href={`/builds/library${suffix}`}>
            Build library <ArrowRight size={15} />
          </Link>
        </div>
        <ActivityGrid activities={activities} suffix={suffix} />
      </section>

      <section className="landing-wrap landing-tools" aria-labelledby="home-tools-title">
        <div className="section-heading landing-section-heading">
          <h2 id="home-tools-title">
            Powerful <em>tools</em> for every Albion player.
          </h2>
          <p>
            From market research to build planning and group compositions — everything you need in
            one place.
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
            description="Compare prices across cities and find the best buy and sell spots."
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
            description="True crafting cost, profit and margin before you craft."
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
            description="Plan a session, tick off what you own, see what to buy."
            href={`/shopping-list${suffix}`}
            action="Open Crafting Planner"
          >
            <PlannerCard plan={[...showcase.plan]} />
          </PreviewShell>
        </div>
      </section>

      <TopKills suffix={suffix} serverName={`Albion ${regions[region].label}`} />

      <section className="landing-wrap landing-guides" aria-labelledby="home-guides-title">
        <div className="section-heading landing-section-heading">
          <h2 id="home-guides-title">
            Learn from <em>players</em>.
          </h2>
          <p>
            {library.guides} guides on progression, gathering, PvE and the market, each with its
            author and the date it was last updated.
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

      <section className="landing-plans" aria-labelledby="home-plans-title">
        <picture className="landing-plans-art" aria-hidden="true">
          <source media="(max-width: 700px)" srcSet="/albion/illustrations/market-v1-phone.webp" />
          <img
            src="/albion/illustrations/market-v1.webp"
            alt=""
            width={900}
            height={507}
            loading="lazy"
            decoding="async"
          />
        </picture>
        <div className="landing-wrap landing-plans-inner">
          <div className="section-heading landing-section-heading">
            <h2 id="home-plans-title">
              Free for everyone. <em>Supporters</em> keep it running.
            </h2>
            <p>
              Every tool, build and guide is open without an account. A monthly Supporter plan
              removes the ads and gives your guild its own Team workspace.
            </p>
          </div>
          <div className="plan-grid">
            <article className="raised has-scene plan-card" data-scene="city">
              <header>
                <span className="plan-name">Free</span>
                <strong className="plan-price">No account needed</strong>
              </header>
              <ul>
                <li>
                  <Check size={16} aria-hidden="true" /> Market explorer and {tools.length}{" "}
                  calculators
                </li>
                <li>
                  <Check size={16} aria-hidden="true" /> {n(library.builds)} builds and{" "}
                  {n(library.compositions)} group comps
                </li>
                <li>
                  <Check size={16} aria-hidden="true" /> Guides, kill feed and timers
                </li>
                <li>
                  <Check size={16} aria-hidden="true" /> Sign in with Discord to save builds, comps
                  and scenarios
                </li>
              </ul>
              <div className="plan-actions">
                <Link href={`/tools${suffix}`} className="button secondary">
                  Explore the tools
                </Link>
                <Link href={`/signin${suffix}`} className="plan-link">
                  Sign in with Discord
                </Link>
              </div>
            </article>
            <article className="raised has-scene plan-card is-supporter" data-scene="market">
              <header>
                <span className="plan-name">
                  Supporter{!billing ? <span className="landing-chip">Opening soon</span> : null}
                </span>
                <strong className="plan-price">{price ?? "Monthly subscription"}</strong>
              </header>
              <ul>
                <li>
                  <Check size={16} aria-hidden="true" /> No ads anywhere on Outpost
                </li>
                <li>
                  <Check size={16} aria-hidden="true" /> Create and run your own Teams
                </li>
                <li>
                  <Check size={16} aria-hidden="true" /> Content announcements, RSVPs and the
                  calendar
                </li>
                <li>
                  <Check size={16} aria-hidden="true" /> Shared comps and loot splits for your
                  members
                </li>
              </ul>
              <div className="plan-actions">
                <Link href={`/supporter${suffix}`} className="button primary">
                  {billing ? "Become a Supporter" : "About the Supporter plan"}{" "}
                  <ArrowRight size={17} />
                </Link>
                {billing ? <small>Cancel any time from your account.</small> : null}
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
