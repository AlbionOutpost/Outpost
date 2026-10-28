import "./homepage.css";
import "./home-fidelity.css";
import { HomeMarketTerminal } from "@/components/home-market-terminal";
import { ItemIcon } from "@/components/item-icon";
import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ChartNoAxesCombined,
  Swords,
  Users,
  BookOpen,
  Database,
  Globe2,
  Shield,
  Crosshair,
  HeartPulse,
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
  return (
    <div className="reference-home home-fidelity">
      <HomeMarketTerminal
        hero={
          <div className="reference-hero-copy">
            <span className="eyebrow">THE ALBION ONLINE COMPANION</span>
            <h1 id="home-title">
              <span>Better tools.</span>
              <span>
                For a <em>richer Albion.</em>
              </span>
            </h1>
            <p>
              Market tools, profit calculators, builds, comps and guild management. Make better
              decisions and get more from Albion Online.
            </p>
            <div className="actions">
              <Link className="button primary" href={`/tools${suffix}`}>
                Explore Tools <ArrowRight size={18} />
              </Link>
              <Link className="button secondary" href={`/builds${suffix}`}>
                Browse Builds <ArrowRight size={18} />
              </Link>
            </div>
            <div className="reference-hero-facts">
              <span>
                <Database size={16} /> Player-observed prices
              </span>
              <span>
                <Globe2 size={16} /> All three regions
              </span>
              <span>
                <Users size={16} /> Built for your party
              </span>
            </div>
          </div>
        }
      >
        <section className="reference-discovery" aria-labelledby="discover-title">
          <div className="reference-section-heading">
            <div>
              <span className="eyebrow">START HERE</span>
              <h2 id="discover-title">Find what you need, faster.</h2>
              <p>Powerful tools for every kind of player. Start with your next move.</p>
            </div>
            <Link className="reference-guide-link" href={`/guides${suffix}`}>
              <span className="home-guide-mark">
                <BookOpen size={23} />
              </span>
              <span>
                <strong>New to Outpost?</strong>
                <small>A quick guide to getting started</small>
              </span>
              <span className="home-guide-action">
                View guides <ArrowRight size={14} />
              </span>
            </Link>
          </div>
          <div className="reference-feature-grid">
            <article className="reference-feature feature-market">
              <span className="eyebrow">
                <ChartNoAxesCombined size={18} /> MARKET EXPLORER
              </span>
              <h3>
                Find opportunities in
                <br />
                any city market.
              </h3>
              <p>Compare city prices, check history and plan your next trade.</p>
              <div className="home-market-illustration" data-asset-status="generated">
                <Image
                  src="/albion/illustrations/market-v1.webp"
                  alt=""
                  fill
                  sizes="(max-width:780px) 240px, 320px"
                />
              </div>
              <Link className="button primary" href={`/tools/market${suffix}`}>
                Open Market Explorer <ArrowRight size={15} />
              </Link>
            </article>
            <article className="reference-feature feature-build">
              <span className="eyebrow">
                <Swords size={18} /> BUILD CREATOR
              </span>
              <h3>
                Plan and share
                <br />
                loadouts with ease.
              </h3>
              <p>Your equipment, abilities and alternatives. Ready for your next fight.</p>
              <div
                className="home-loadout-preview"
                role="group"
                aria-label="Equipment selection preview"
              >
                {[
                  "T4_HEAD_LEATHER_SET1",
                  "T4_MAIN_AXE",
                  "T4_ARMOR_LEATHER_SET1",
                  "T4_OFF_SHIELD",
                  "T4_SHOES_LEATHER_SET1",
                  "T4_CAPE",
                ].map((id) => (
                  <span key={id}>
                    <ItemIcon id={id} size={58} />
                  </span>
                ))}
              </div>
              <Link className="button primary" href={`/builds/new${suffix}`}>
                Create a build <ArrowRight size={15} />
              </Link>
            </article>
            <article className="reference-feature feature-party">
              <span className="eyebrow">
                <Users size={18} /> COMPOSITION PLANNER
              </span>
              <h3>
                Build stronger
                <br />
                groups and guilds.
              </h3>
              <p>Plan clear roles, party loadouts and equipment swaps together.</p>
              <div className="home-party-preview" role="group" aria-label="Role planning preview">
                <span>
                  <Shield size={13} />
                  <ItemIcon id="T4_OFF_SHIELD" size={48} />
                  <small>Tank</small>
                </span>
                <span>
                  <HeartPulse size={13} />
                  <ItemIcon id="T4_MAIN_HOLYSTAFF" size={48} />
                  <small>Healer</small>
                </span>
                <span>
                  <Crosshair size={13} />
                  <ItemIcon id="T4_2H_BOW" size={48} />
                  <small>DPS</small>
                </span>
              </div>
              <Link className="button primary" href={`/compositions/new${suffix}`}>
                Plan a composition <ArrowRight size={15} />
              </Link>
            </article>
          </div>
        </section>
      </HomeMarketTerminal>
    </div>
  );
}
