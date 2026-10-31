import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { regionSchema } from "@/lib/albion/region-config";
import { ArrowRight, BadgeCheck, EyeOff, HeartHandshake, Lock } from "lucide-react";
import "@/app/premium.css";

export const metadata: Metadata = {
  title: "Premium",
  description: "Outpost without ads, and a way to support the project.",
};

/**
 * The ad-free tier. Nothing is sold yet: this page states what Premium will and will not
 * change so the "go ad-free" links have an honest destination before billing exists.
 */
export default async function Premium({
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
    <div className="premium-page">
      <WorkspaceHeading
        glyph="guild"
        scene="comps"
        title="Outpost without ads"
        description="Every tool stays free for everyone. Premium removes advertising and helps pay for hosting and market data."
      />
      <section className="premium-grid" aria-label="What Premium changes">
        <article>
          <EyeOff size={22} aria-hidden="true" />
          <h2>No advertising</h2>
          <p>Ad units disappear from every page on the account that holds Premium.</p>
        </article>
        <article>
          <HeartHandshake size={22} aria-hidden="true" />
          <h2>Keeps the project independent</h2>
          <p>Market data, Workers and storage cost money each month; Premium covers it.</p>
        </article>
        <article>
          <BadgeCheck size={22} aria-hidden="true" />
          <h2>Nothing is held back</h2>
          <p>Prices, builds, calculators and Teams are never locked behind the plan.</p>
        </article>
        <article>
          <Lock size={22} aria-hidden="true" />
          <h2>Checked on the server</h2>
          <p>The plan lives on your account record and is verified on every request.</p>
        </article>
      </section>
      <section className="premium-status" aria-labelledby="premium-status-title">
        <h2 id="premium-status-title">Not for sale yet</h2>
        <p>
          Billing is not switched on. Until it is, nobody is charged and nobody is excluded. Sign in
          with Discord so the plan can be attached to your account when it launches.
        </p>
        <div className="landing-actions">
          <Link href={`/signin${suffix}`} className="button primary">
            Sign in with Discord <ArrowRight size={17} />
          </Link>
          <Link href={`/tools${suffix}`} className="button secondary">
            Keep using Outpost free
          </Link>
        </div>
      </section>
    </div>
  );
}
