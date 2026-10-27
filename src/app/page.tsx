import "./homepage.css";
import { HomeMarketTerminal } from "@/components/home-market-terminal";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, Hammer, Swords, Users } from "lucide-react";
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
    <div className="home-start">
      <section className="home-introduction" aria-labelledby="home-title">
        <h1 id="home-title">
          Better trades.
          <br />
          <em>Better prepared.</em>
        </h1>
        <p>
          Compare city prices, work out crafting profit and put your next set together. Your Albion
          tools, in one place.
        </p>
        <nav className="home-task-list" aria-label="Start a task">
          <Link href={`/builds/new${suffix}`}>
            <Swords aria-hidden="true" />
            <span>
              <strong>Create a build</strong>
              <small>Choose gear, abilities and swaps</small>
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href={`/tools/crafting${suffix}`}>
            <Hammer aria-hidden="true" />
            <span>
              <strong>Price a crafting run</strong>
              <small>Materials, returns and profit</small>
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href={`/compositions${suffix}`}>
            <Users aria-hidden="true" />
            <span>
              <strong>Plan your comp</strong>
              <small>Assign roles and party loadouts</small>
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
        </nav>
        <p className="home-secondary">
          Playing with a guild?{" "}
          <Link href={`/groups${suffix}`}>
            Open guild tools <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </p>
      </section>
      <div className="home-product-preview">
        <HomeMarketTerminal />
      </div>
    </div>
  );
}
