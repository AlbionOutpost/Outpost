import "./homepage.css";
import { AdSlot } from "@/components/ad-slot";
import { BuildShowcase, type ShowcaseBuild } from "@/components/landing/build-showcase";
import { CraftingPreview } from "@/components/landing/crafting-preview";
import { GroupRoles } from "@/components/landing/group-roles";
import { MarketPreview } from "@/components/landing/market-preview";
import { PreviewShell } from "@/components/landing/preview-shell";
import { ToolIcon } from "@/components/tool-icon";
import {
  featuredLibraryBuilds,
  findLibraryBuilds,
  findLibraryComposition,
  libraryCounts,
  librarySpellNames,
} from "@/lib/grind-library";
import { activityName } from "@/lib/grind-library-types";
import { gameDataSource, itemName } from "@/lib/albion/game/recipes";
import { regionSchema } from "@/lib/albion/region-config";
import { tools } from "@/lib/tool-directory";
import { cookies } from "next/headers";
import Link from "@/components/link";
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Database,
  Layers,
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
    kind: "Refined material",
    cities: ["Bridgewatch", "Caerleon", "Martlock", "Thetford", "Lymhurst"],
    trendCities: ["Bridgewatch", "Caerleon", "Martlock", "Lymhurst", "Thetford", "Fort Sterling"],
  },
  crafting: {
    recipes: [
      { id: "battleaxe-t6", output: "T6_MAIN_AXE" },
      { id: "battleaxe-t5", output: "T5_MAIN_AXE" },
      { id: "battleaxe-t4", output: "T4_MAIN_AXE" },
      { id: "broadsword-t6", output: "T6_MAIN_SWORD" },
      { id: "bow-t6", output: "T6_2H_BOW" },
      { id: "bag-t6", output: "T6_BAG" },
      { id: "cape-t6", output: "T6_CAPE" },
    ],
    refining: [
      { id: "metalbar-t6", output: "T6_METALBAR" },
      { id: "planks-t6", output: "T6_PLANKS" },
      { id: "leather-t6", output: "T6_LEATHER" },
      { id: "cloth-t6", output: "T6_CLOTH" },
      { id: "metalbar-t5", output: "T5_METALBAR" },
      { id: "planks-t5", output: "T5_PLANKS" },
    ],
    cities: ["Bridgewatch", "Martlock", "Lymhurst", "Fort Sterling", "Thetford", "Caerleon"],
  },
  // One public build per activity tab; the first is the featured one.
  builds: [
    { slug: "battleaxe-mist-build", label: "Solo Mists" },
    { slug: "carving-sword-smallscale-build", label: "Small scale" },
    { slug: "great-hammer-zvz-build", label: "ZvZ" },
    { slug: "bloodmoon-staff-group-dungeon-solo-build", label: "PvE" },
  ],
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
  const [library, spellNames, picked, composition] = await Promise.all([
    libraryCounts(),
    librarySpellNames(),
    findLibraryBuilds(showcase.builds.map((b) => b.slug)),
    findLibraryComposition(showcase.composition),
  ]);
  const [fallback, members] = await Promise.all([
    picked.length ? Promise.resolve([]) : featuredLibraryBuilds(),
    composition ? findLibraryBuilds(composition.members) : Promise.resolve([]),
  ]);
  const builds: ShowcaseBuild[] = showcase.builds.flatMap(({ slug, label }) => {
    const b = picked.find((row) => row.slug === slug);
    return b
      ? [
          {
            slug: b.slug,
            title: b.title,
            category: b.category,
            weaponName: b.weaponName,
            author: b.author,
            equipment: b.equipment,
            tags: b.tags,
            upvotes: b.upvotes,
            label,
          },
        ]
      : [];
  });
  if (!builds.length && fallback[0]) {
    const b = fallback[0];
    builds.push({ ...b, label: activityName(b.category) });
  }
  // Only the ability names these builds use travel to the client.
  const usedSpells = new Set(builds.flatMap((b) => b.equipment.flatMap((e) => e.skills)));
  const spellLabels = Object.fromEntries(
    [...usedSpells].flatMap((id) => (spellNames[id] ? [[id, spellNames[id]]] : [])),
  );
  const n = (value: number) => value.toLocaleString("en-US");
  const gameData = gameDataSource.charAt(0).toLowerCase() + gameDataSource.slice(1);
  const named = (list: readonly { id: string; output: string }[]) =>
    list.map((r) => ({ ...r, name: itemName(r.output).replace(/ \(T\d\.\d\)$/, "") }));
  const recipes = named(showcase.crafting.recipes);
  const refining = named(showcase.crafting.refining);
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
          </div>
          <ul className="landing-benefits" aria-label="What Outpost does">
            <li>
              <ChartNoAxesCombined size={20} aria-hidden="true" />
              <strong>Real market data</strong>
              <span>All cities and the Black Market</span>
            </li>
            <li>
              <Swords size={20} aria-hidden="true" />
              <strong>Build planning</strong>
              <span>For any content</span>
            </li>
            <li>
              <Users size={20} aria-hidden="true" />
              <strong>Group coordination</strong>
              <span>Comps, Teams and loot splits</span>
            </li>
            <li>
              <ShieldCheck size={20} aria-hidden="true" />
              <strong>Independent project</strong>
              <span>Built by Albion players</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="landing-wrap landing-tools" aria-labelledby="home-tools-title">
        <div className="landing-section-heading">
          <h2 id="home-tools-title">
            Powerful <em>tools</em> for every Albion player.
          </h2>
          <p>
            From market research to build planning and group compositions — everything you need in
            one place.
          </p>
          <Link className="text-link" href={`/tools${suffix}`}>
            View all tools <ArrowRight size={15} />
          </Link>
        </div>
        <div className="landing-card-grid">
          <PreviewShell
            id="home-market"
            glyph="market"
            title="Market Explorer"
            description="Compare prices across all cities, track trends and find the best opportunities."
            href={`/tools/market?item=${showcase.market.id}&quality=1&region=${region}`}
            action="Open Market Explorer"
          >
            <MarketPreview
              item={{
                id: showcase.market.id,
                name: itemName(showcase.market.id),
                tier: "Tier 6",
                kind: showcase.market.kind,
              }}
              cities={showcase.market.cities}
              trendCities={showcase.market.trendCities}
              suffix={suffix}
            />
          </PreviewShell>
          <PreviewShell
            id="home-build"
            glyph="equipment"
            title="Build Library"
            description="Discover and share builds with full equipment, abilities and alternatives."
            href={`/builds/library${suffix}`}
            action="Browse Builds"
          >
            <BuildShowcase builds={builds} spellNames={spellLabels} suffix={suffix} />
          </PreviewShell>
          <PreviewShell
            id="home-crafting"
            glyph="craft"
            title="Crafting Calculator"
            description="Calculate costs, fees and profit for any item against current orders."
            href={`/tools/crafting?recipe=${showcase.crafting.recipes[0].id}&region=${region}`}
            action="Open Crafting Calculator"
          >
            <CraftingPreview
              crafting={recipes}
              refining={refining}
              cities={showcase.crafting.cities}
              initialCity={showcase.crafting.cities[0]}
            />
          </PreviewShell>
        </div>
      </section>

      {composition && (
        <section className="landing-wrap landing-group" aria-labelledby="home-group-title">
          <div className="landing-group-card">
            <div className="landing-group-copy">
              <span className="landing-card-emblem" aria-hidden="true">
                <ToolIcon name="composition" size={22} />
              </span>
              <div>
                <h2 id="home-group-title">Group Compositions</h2>
                <p>
                  Plan and organise group compositions for any content, from ganking to ZvZ.{" "}
                  {n(library.compositions)} public group builds to copy.
                </p>
              </div>
              <span className="landing-card-tag">Roles by weapon type</span>
            </div>
            <div className="landing-group-body">
              <p className="landing-group-source">
                <strong>{composition.title}</strong> · {activityName(composition.category)} ·{" "}
                {composition.members.length} members · by {composition.author}
              </p>
              <GroupRoles composition={composition} members={members} suffix={suffix} />
            </div>
            <Link
              href={`/compositions/library/${encodeURIComponent(composition.slug)}${suffix}`}
              className="landing-card-action landing-group-action"
            >
              Explore Compositions <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      <section className="landing-wrap landing-why" aria-labelledby="home-why-title">
        <h2 id="home-why-title">Why choose Outpost?</h2>
        <ul className="landing-why-grid">
          <li>
            <Database size={22} aria-hidden="true" />
            <strong>Real data, real insights</strong>
            <span>
              Live and historical market data from the Albion Online Data Project across all cities
              and regions.
            </span>
          </li>
          <li>
            <Users size={22} aria-hidden="true" />
            <strong>Built for players</strong>
            <span>
              {n(library.builds)} builds and {n(library.compositions)} group builds by Albion
              players, each with its author and date.
            </span>
          </li>
          <li>
            <ShieldCheck size={22} aria-hidden="true" />
            <strong>Transparent and reliable</strong>
            <span>
              Clear sources and source times; a missing price stays missing. Recipes and stats from{" "}
              {gameData}.
            </span>
          </li>
          <li>
            <Layers size={22} aria-hidden="true" />
            <strong>Everything in one place</strong>
            <span>
              Market tools, build planning, calculators, guides, comps and Teams — designed to work
              together.
            </span>
          </li>
        </ul>
      </section>

      <div className="landing-wrap">
        <AdSlot slot="0000000000" suffix={suffix} />
      </div>

      <section className="landing-cta" aria-labelledby="home-cta-title">
        <picture className="landing-cta-art" aria-hidden="true">
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
        <div className="landing-wrap landing-cta-inner">
          <p className="landing-eyebrow">Ready to get started?</p>
          <h2 id="home-cta-title">
            Make better decisions
            <br />
            in Albion Online.
          </h2>
          <p>Browse everything without an account, or sign in to save builds and run a Team.</p>
          <div className="landing-actions">
            <Link href={`/signin${suffix}`} className="button primary">
              Create account <ArrowRight size={17} />
            </Link>
            <Link href={`/tools${suffix}`} className="button secondary">
              Explore without an account
            </Link>
          </div>
          <small>Free to use. No paywalls for core features.</small>
        </div>
      </section>
    </div>
  );
}
