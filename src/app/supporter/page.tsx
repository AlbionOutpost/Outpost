import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import Link from "@/components/link";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { SupporterActions } from "@/components/supporter-actions";
import { authOptions } from "@/lib/auth";
import { regionSchema } from "@/lib/albion/region-config";
import { billingProfile } from "@/lib/billing/plan";
import { getPrice, stripeConfig } from "@/lib/billing/stripe";
import {
  ArrowRight,
  BadgeCheck,
  EyeOff,
  HeartHandshake,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import "@/app/supporter.css";

export const metadata: Metadata = {
  title: "Supporter",
  description: "Outpost without ads and with a home for your team: the Supporter plan.",
};

let priceCache: { at: number; label: string | null } | null = null;
/** The live price from Stripe, cached ten minutes; null when billing is off or Stripe is unreachable. */
async function priceLabel() {
  const config = stripeConfig();
  if (!config) return null;
  if (priceCache && Date.now() - priceCache.at < 600000) return priceCache.label;
  try {
    const price = await getPrice(config);
    const amount =
      price.unit_amount == null
        ? null
        : new Intl.NumberFormat("en", { style: "currency", currency: price.currency }).format(
            price.unit_amount / 100,
          );
    const every = price.recurring
      ? price.recurring.interval_count > 1
        ? `every ${price.recurring.interval_count} ${price.recurring.interval}s`
        : `per ${price.recurring.interval}`
      : "";
    priceCache = { at: Date.now(), label: amount ? `${amount} ${every}`.trim() : null };
  } catch {
    priceCache = { at: Date.now(), label: null };
  }
  return priceCache.label;
}

/**
 * The Supporter plan: no advertising and a Team workspace of your own, for a monthly
 * subscription through Stripe. States: billing not configured (nothing for sale, nothing
 * locked), signed out, free account, supporter.
 */
export default async function Supporter({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; checkout?: string }>;
}) {
  const params = await searchParams;
  const region = regionSchema
    .catch("europe")
    .parse(params.region || (await cookies()).get("atlas-region")?.value);
  const suffix = `?region=${region}`;
  const configured = stripeConfig() !== null;
  const session = await getServerSession(authOptions);
  const profile = session?.user?.id ? await billingProfile(session.user.id) : null;
  const supporter = profile?.plan === "SUPPORTER";
  const price = await priceLabel();
  const renews = profile?.planRenewsAt
    ? profile.planRenewsAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  return (
    <div className="premium-page supporter-page">
      <WorkspaceHeading
        glyph="guild"
        scene="comps"
        title="Support Outpost"
        description="Every tool stays free for everyone. Supporters see no advertising and run their own Team workspace."
      >
        <div className="landing-chips masthead-chips">
          <span className="landing-chip">{price ? `${price}` : "Monthly subscription"}</span>
          <span className="landing-chip is-muted">Cancel any time</span>
          <span className="landing-chip is-muted">Billed by Stripe</span>
        </div>
      </WorkspaceHeading>
      <section className="premium-grid" aria-label="What Supporter includes">
        <article className="raised">
          <EyeOff size={22} aria-hidden="true" />
          <h2>No advertising</h2>
          <p>Ad units disappear from every page on the account that holds the plan.</p>
        </article>
        <article className="raised">
          <Users size={22} aria-hidden="true" />
          <h2>Run your Team</h2>
          <p>
            Create a Team workspace and manage its events, announcements, shared comps, loot splits
            and roster. Members join and take part for free.
          </p>
        </article>
        <article className="raised">
          <HeartHandshake size={22} aria-hidden="true" />
          <h2>Keeps the project independent</h2>
          <p>Market data, Workers and storage cost money each month; Supporters cover it.</p>
        </article>
        <article className="raised">
          <BadgeCheck size={22} aria-hidden="true" />
          <h2>Nothing else is held back</h2>
          <p>Prices, builds, calculators, guides and comps are never locked behind the plan.</p>
        </article>
      </section>
      <section className="raised premium-status" aria-labelledby="premium-status-title">
        {!configured ? (
          <>
            <h2 id="premium-status-title">Not for sale yet</h2>
            <p>
              Billing is not switched on. Until it is, nobody is charged and nothing is locked. Sign
              in with Discord so the plan can be attached to your account when it launches.
            </p>
            <div className="landing-actions">
              <Link href={`/signin${suffix}`} className="button primary">
                Sign in with Discord <ArrowRight size={17} />
              </Link>
              <Link href={`/tools${suffix}`} className="button secondary">
                Keep using Outpost free
              </Link>
            </div>
          </>
        ) : !profile ? (
          <>
            <h2 id="premium-status-title">Sign in to become a Supporter</h2>
            <p>
              The plan lives on your Outpost account. Sign in with Discord, then subscribe through
              Stripe{price ? ` for ${price}` : ""}.
            </p>
            <div className="landing-actions">
              <Link
                href={`/signin?callbackUrl=%2Fsupporter${suffix.replace("?", "%3F")}`}
                className="button primary"
              >
                Sign in with Discord <ArrowRight size={17} />
              </Link>
            </div>
          </>
        ) : supporter ? (
          <>
            <h2 id="premium-status-title">You are a Supporter</h2>
            <p>
              Thank you. {renews ? `Your plan renews on ${renews}.` : "Your plan is active."}{" "}
              {profile.planStatus === "past_due" &&
                "The last payment failed; update your card to keep the plan."}{" "}
              Change the card, download invoices or cancel in Stripe&apos;s billing portal.
            </p>
            <SupporterActions region={region} mode="manage" />
          </>
        ) : (
          <>
            <h2 id="premium-status-title">
              {params.checkout === "success" ? "Almost there" : "Become a Supporter"}
            </h2>
            <p>
              {params.checkout === "success"
                ? "Stripe confirmed your payment; the plan is applied to your account as soon as the confirmation arrives, usually within a minute. Reload this page to check."
                : `${price ? `${price}, cancel` : "Cancel"} any time. Checkout and card details stay with Stripe; Outpost only records that the plan is active.`}
            </p>
            {params.checkout !== "success" && <SupporterActions region={region} mode="subscribe" />}
          </>
        )}
        <p className="premium-footnote">
          <ShieldCheck size={14} aria-hidden="true" /> The plan is checked on the server on every
          request. <Lock size={14} aria-hidden="true" /> Outpost never sees your card.
        </p>
      </section>
    </div>
  );
}
