import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { regionSuffix } from "@/lib/build-region";
import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import { ArrowRight, Lock } from "lucide-react";
import Link from "@/components/link";
import { SupporterActions } from "@/components/supporter-actions";
import { SupporterOrder } from "@/components/supporter-order";
import { SupporterBadge } from "@/components/supporter-badge";
import { SupporterBand } from "@/components/supporter-band";
import { SectionHeading } from "@/components/section-heading";
import { PanelHead } from "@/components/panel-head";
import { NextStepCards } from "@/components/next-step-cards";
import { DiscordMark } from "@/components/discord-mark";
import { authOptions } from "@/lib/auth";
import { regionSchema } from "@/lib/albion/region-config";
import { giftedSupporter } from "@/lib/admin/policy";
import {
  billingProfile,
  isSupporter,
  launchOpen,
  salesOpen,
  supporterSource,
} from "@/lib/billing/plan";
import { supporterPrice } from "@/lib/billing/price";
import { billingEnabled, getSubscription, stripeConfig } from "@/lib/billing/stripe";
import { resolveLegalLocale } from "@/lib/legal-language";
import { smallBusiness } from "@/lib/legal";
import { notFound, redirect } from "next/navigation";
import "@/app/landing-window.css";
import windows from "@/components/landing/windows.module.css";
import "@/app/supporter.css";

/** What a Team workspace does, in the landing Team Management window's words. */
const teamFeatures = [
  ["team-announce", "Content announcements", "Time, mass-up, comp · members RSVP"],
  ["team-comps", "Shared comps", "Per-slot loadouts and swaps for every member"],
  ["team-loot", "Loot splits", "Haul, repair and tax, split fairly, kept"],
  ["team-calendar", "Calendar", "Every event exports to ICS"],
  ["team-roles", "Roles & invites", "Owner, officers, members · private by default"],
] as const;

const longDate = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * The Supporter plan: no ads, the Supporter badge and the right to create Teams. During launch
 * every account is a lifetime Supporter for free (`launchGrant` in src/lib/billing/plan.ts), so
 * the page says that and nothing about prices or payment. After the launch closes, accounts made
 * before it keep their Team rights for life and may still buy the plan for no ads and the badge.
 * States: launch grant open (signed in or out), launch account after the close, plan not on sale
 * (`salesOpen()` false: no Stripe keys or terms unpublished), signed out, free account,
 * supporter (renewing or cancelled to the period end), gifted supporter.
 */
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/supporter", await searchParams);
}
export default async function Supporter({
  searchParams,
}: {
  searchParams: Promise<{
    region?: string;
    checkout?: string;
    lang?: string;
    redirect_status?: string;
    payment_intent?: string;
    payment_intent_client_secret?: string;
  }>;
}) {
  const params = await searchParams;
  // Stripe returns from a redirect payment step with the payment's id and secret in the URL;
  // keep only its outcome, so the secret never stays in history, logs or a shared link.
  if (params.payment_intent || params.payment_intent_client_secret) {
    const clean = new URLSearchParams();
    for (const key of ["region", "lang", "checkout", "redirect_status"] as const)
      if (typeof params[key] === "string") clean.set(key, params[key]);
    redirect(`/supporter?${clean}`);
  }
  // Back from paying: Stripe says the payment failed, or it went through (the plan follows the
  // webhook). Neither is trusted for anything but this message.
  const paymentFailed = params.checkout === "success" && params.redirect_status === "failed";
  const paid = params.checkout === "success" && !paymentFailed;
  const region = regionSchema
    .catch("europe")
    .parse(params.region || (await cookies()).get("atlas-region")?.value);
  const suffix = regionSuffix(region);
  const config = stripeConfig();
  const configured = config !== null;
  const onSale = salesOpen();
  const session = await getServerSession(authOptions);
  const profile = session?.user?.id ? await billingProfile(session.user.id) : null;
  const supporter = isSupporter(profile);
  const gifted = giftedSupporter(profile);
  const source = supporterSource(profile);
  // While the launch is on, every account, old or new, is a lifetime Supporter, free (a plan or a
  // gift still shows as itself).
  const launch = launchOpen() && (!profile || source === "launch");
  // After the close, an account made during the launch keeps its Team rights for life.
  const launchAccount = !launchOpen() && source === "launch";
  // Nothing is for sale while billing is off (owner, 6 Nov 2026): outside the launch the plan page
  // exists only for accounts that hold Supporter (a gift, the plan or the launch grant).
  if (!billingEnabled() && !supporter && !launchOpen()) notFound();
  const locale = resolveLegalLocale(params.lang, (await headers()).get("accept-language"));
  const [price, orderPrice] = launch
    ? [null, null]
    : await Promise.all([supporterPrice(), supporterPrice(locale)]);
  // A Supporter's renewal or end date, read live from Stripe: after a cancellation the plan
  // ends instead of renewing. Only the account's own subscription counts.
  let ends: string | null = null;
  let renews = profile?.planRenewsAt ? longDate(profile.planRenewsAt) : null;
  if (config && source === "plan" && profile?.stripeSubscriptionId) {
    try {
      const live = await getSubscription(config, profile.stripeSubscriptionId);
      if (live.customer === profile.stripeCustomerId) {
        const end = live.current_period_end
          ? longDate(new Date(live.current_period_end * 1000))
          : null;
        if (live.cancel_at_period_end) [ends, renews] = [end, null];
        else renews = end ?? renews;
      }
    } catch {
      // Stripe unreachable: keep the stored renewal date.
    }
  }
  const order = (
    <a href="#supporter-order" className="button primary">
      Order the plan <ArrowRight size={16} aria-hidden="true" />
    </a>
  );
  // The order box: a signed-in account that can buy the plan right now.
  const showOrder =
    onSale && !!config && !!profile && !launch && source !== "plan" && !gifted && !paid;
  const cancelLink = (
    <Link href="/supporter/cancel" className="button secondary">
      Cancel subscription
    </Link>
  );
  const signIn = (
    <Link
      href={`/signin?callbackUrl=%2Fsupporter${suffix.replace("?", "%3F")}`}
      className="button primary"
    >
      <DiscordMark /> Sign in with Discord
    </Link>
  );
  const free = (
    <Link href={`/tools${suffix}`} className="button secondary">
      Keep using Outpost free
    </Link>
  );
  // One state, said once, in the band: what the plan is for this visitor right now.
  const state = launch
    ? profile
      ? {
          title: (
            <>
              You are a lifetime <em>Supporter</em>
            </>
          ),
          line: "A launch grant: every Outpost account is a lifetime Supporter, free. There is nothing to pay and nothing to renew, and your Team workspace is yours to run.",
          actions: (
            <Link href={`/groups/new${suffix}`} className="button primary">
              Start a team <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ),
        }
      : {
          title: (
            <>
              Every account is a <em>Supporter</em>
            </>
          ),
          line: "A launch grant: every Outpost account, including new ones, is a lifetime Supporter, free. Sign in with Discord and yours has it straight away.",
          actions: signIn,
        }
    : launchAccount && !gifted && !paid
      ? {
          title: (
            <>
              Your Team rights are <em>for life</em>
            </>
          ),
          line: `Your account was made during the launch, so creating and running Teams stays free for you. ${onSale ? `The Supporter plan adds no ads and the Supporter badge${price ? `, for ${price}` : ""}.` : "Nothing to pay and nothing to renew."}`,
          actions: onSale ? (
            order
          ) : (
            <Link href={`/groups/new${suffix}`} className="button primary">
              Start a team <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ),
        }
      : gifted
        ? {
            title: (
              <>
                Your Supporter <em>gift</em> is active
              </>
            ),
            line: `You have every Supporter benefit${profile?.supporterGiftUntil && !profile.supporterGiftPermanent ? ` until ${profile.supporterGiftUntil.toLocaleDateString("en-GB", { timeZone: "UTC" })}` : " until the gift is revoked"}. A gift never creates a charge or changes a subscription.`,
            actions:
              profile?.stripeCustomerId && configured ? <SupporterActions region={region} /> : free,
          }
        : source === "plan"
          ? {
              title: (
                <>
                  You are a <em>Supporter</em>
                </>
              ),
              line: `Thank you. ${ends ? `You cancelled: your plan ends on ${ends} and is not charged again.` : renews ? `Your plan renews on ${renews}.` : "Your plan is active."}${profile?.planStatus === "past_due" ? " The last payment failed; update your card to keep the plan." : ""} Change the card or get invoices in Stripe's billing portal.`,
              actions: (
                <>
                  <SupporterActions region={region} />
                  {!ends && cancelLink}
                </>
              ),
            }
          : !onSale
            ? {
                title: (
                  <>
                    Supporter is not on sale <em>yet</em>
                  </>
                ),
                line: "The plan will bring no ads, the Supporter badge and the right to create Teams. It is not on sale yet, so nobody is charged. Joining a team stays free.",
                actions: (
                  <>
                    {!profile && (
                      <Link href={`/signin${suffix}`} className="button primary">
                        <DiscordMark /> Sign in with Discord
                      </Link>
                    )}
                    {free}
                  </>
                ),
              }
            : !profile
              ? {
                  title: (
                    <>
                      Become a <em>Supporter</em>
                    </>
                  ),
                  line: `No ads, the Supporter badge and the right to create Teams${price ? `, for ${price}` : ""}. The plan lives on your Outpost account, so sign in first.`,
                  actions: signIn,
                }
              : paid
                ? {
                    title: (
                      <>
                        Almost <em>there</em>
                      </>
                    ),
                    line: "Your payment went to Stripe. The plan reaches your account as soon as Stripe confirms it, usually within a minute; reload this page to check.",
                    actions: free,
                  }
                : {
                    title: (
                      <>
                        Become a <em>Supporter</em>
                      </>
                    ),
                    line: `No ads, the Supporter badge and the right to create Teams${price ? `, for ${price}` : ""}. Cancel any time to the end of the paid month.`,
                    actions: order,
                  };
  return (
    <div className="supporter-page">
      <SupporterBand
        id="supporter-status-title"
        as="h1"
        title={state.title}
        line={state.line}
        actions={state.actions}
      >
        {onSale && !launch && !showOrder && (
          <span className="supporter-note">
            <Lock size={14} aria-hidden="true" /> Outpost never sees your card.
          </span>
        )}
      </SupporterBand>
      {showOrder && config && (
        <SupporterOrder
          region={region}
          price={orderPrice}
          locale={locale}
          smallBusiness={smallBusiness()}
          publishableKey={config.publishableKey}
          failed={paymentFailed}
        />
      )}
      <section className="supporter-includes" aria-labelledby="supporter-includes">
        <SectionHeading
          id="supporter-includes"
          title={
            <>
              What {launch ? "Supporter" : "the plan"} <em>includes</em>
            </>
          }
          line={
            launch
              ? "A Team workspace for your guild. Every tool, price and guide stays free for everyone."
              : "Three things, and nothing else changes: every tool, price and guide stays free."
          }
        />
        <div className="supporter-grid">
          <article className={`raised landing-window ${windows.window}`} data-scene="market">
            <div className={`landing-window-bar ${windows.bar}`}>
              <h3 className="landing-window-title">{launch ? "Run your Team" : "Create Teams"}</h3>
              <span className="landing-chips">
                <span className="landing-chip">Supporter</span>
              </span>
            </div>
            <ol className="supporter-features" aria-label="What a Team workspace does">
              {teamFeatures.map(([icon, name, line]) => (
                <li key={icon} className="well">
                  {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                  <img src={`/albion/icons/${icon}.webp`} alt="" width={40} height={40} />
                  <span>
                    <strong>{name}</strong>
                    <small>{line}</small>
                  </span>
                </li>
              ))}
            </ol>
            <Link href={`/groups${suffix}`} className={`landing-window-foot ${windows.foot}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
              <img src="/albion/icons/team-roles.webp" alt="" width={40} height={40} />
              <span>
                <strong>Members join free</strong>
                <small>
                  {launch
                    ? "Every account is a Supporter"
                    : "Only the owner needs the plan. Launch accounts keep it for life"}
                </small>
              </span>
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </article>
          {launch ? (
            <section className="panel supporter-panel" aria-labelledby="supporter-ads">
              <PanelHead
                id="supporter-ads"
                as="h3"
                emblem="fame"
                title="Free, no payment"
                line="The launch grant costs nothing. Ads help keep Outpost free and stay on for launch Supporters."
              />
              <ul className="supporter-points">
                <li className="well">No card, no checkout, no subscription</li>
                <li className="well">The grant stays on your account for life</li>
              </ul>
            </section>
          ) : (
            <section className="panel supporter-panel" aria-labelledby="supporter-ads">
              <PanelHead
                id="supporter-ads"
                as="h3"
                emblem="fame"
                title="No ads, and a badge"
                line="Ad slots disappear for the account that holds the plan, on every device you sign in on."
              />
              <ul className="supporter-points">
                <li className="well">Market, calculators and build pages without ad units</li>
                <li className="well">
                  <span>
                    <SupporterBadge /> beside your name on builds, comps, comments and Teams
                  </span>
                </li>
              </ul>
            </section>
          )}
          <section className="panel supporter-panel" aria-labelledby="supporter-free">
            <PanelHead
              id="supporter-free"
              as="h3"
              emblem="tool-market"
              title="Nothing else is held back"
              line={
                launch
                  ? "Every tool works without an account, and accounts cost nothing."
                  : "Market data, Workers and storage cost money each month; Supporters cover it."
              }
            />
            <ul className="supporter-points">
              <li className="well">Prices, builds, comps and guides stay free</li>
              <li className="well">Joining a Team, RSVPs and loot splits stay free</li>
              {configured && !launch && (
                <li className="well">
                  <span>
                    Cancel any time, to the end of the paid month:{" "}
                    <Link href="/supporter/cancel">cancel subscription</Link>
                  </span>
                </li>
              )}
            </ul>
          </section>
        </div>
      </section>
      <NextStepCards
        id="supporter-next"
        title={
          <>
            Free for <em>everyone</em>
          </>
        }
        line="Every tool works without an account and without the plan."
        cards={[
          {
            href: `/tools/market${suffix}`,
            emblem: "tool-market",
            title: "Market Explorer",
            line: "Prices in every city.",
            scene: "market",
          },
          {
            href: `/tools/crafting${suffix}`,
            emblem: "tool-craft",
            title: "Crafting calculator",
            line: "See if a craft makes silver.",
            scene: "build",
          },
          {
            href: `/builds${suffix}&source=library`,
            emblem: "strip-builds",
            title: "Build library",
            line: "Recorded builds by activity.",
            scene: "city",
          },
        ]}
      />
    </div>
  );
}
