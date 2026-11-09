import { metadataForPage, type SeoPageProps } from "@/lib/seo";
import { regionSuffix } from "@/lib/build-region";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { ArrowRight, Lock } from "lucide-react";
import Link from "@/components/link";
import { SupporterActions } from "@/components/supporter-actions";
import { SupporterBand } from "@/components/supporter-band";
import { SectionHeading } from "@/components/section-heading";
import { PanelHead } from "@/components/panel-head";
import { NextStepCards } from "@/components/next-step-cards";
import { DiscordMark } from "@/components/discord-mark";
import { authOptions } from "@/lib/auth";
import { regionSchema } from "@/lib/albion/region-config";
import { giftedSupporter } from "@/lib/admin/policy";
import { billingProfile, isSupporter, launchOpen, supporterSource } from "@/lib/billing/plan";
import { supporterPrice } from "@/lib/billing/price";
import { billingEnabled, stripeConfig } from "@/lib/billing/stripe";
import { notFound } from "next/navigation";
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

/**
 * The Supporter plan: a Team workspace of your own. During launch every account is a lifetime
 * Supporter for free (`launchGrant` in src/lib/billing/plan.ts), so the page says that and
 * nothing about prices or payment. States: launch grant (signed in or out), billing not
 * configured (nothing for sale, nothing locked), signed out, free account, supporter, gifted
 * supporter.
 */
export async function generateMetadata({ searchParams }: SeoPageProps) {
  return metadataForPage("/supporter", await searchParams);
}
export default async function Supporter({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; checkout?: string }>;
}) {
  const params = await searchParams;
  const region = regionSchema
    .catch("europe")
    .parse(params.region || (await cookies()).get("atlas-region")?.value);
  const suffix = regionSuffix(region);
  const configured = stripeConfig() !== null;
  const session = await getServerSession(authOptions);
  const profile = session?.user?.id ? await billingProfile(session.user.id) : null;
  const supporter = isSupporter(profile);
  const gifted = giftedSupporter(profile);
  // The launch grant: every account, old or new, is a lifetime Supporter, free.
  const launch = profile ? supporterSource(profile) === "launch" : launchOpen();
  // Everything is free while billing is off (owner, 6 Nov 2026): outside the launch the plan page
  // exists only for accounts an admin gifted the plan to, so they can still see it.
  if (!billingEnabled() && !supporter && !launch) notFound();
  const price = launch ? null : await supporterPrice();
  const renews = profile?.planRenewsAt
    ? profile.planRenewsAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;
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
    : gifted
      ? {
          title: (
            <>
              Your Supporter <em>gift</em> is active
            </>
          ),
          line: `You have every Supporter benefit${profile?.supporterGiftUntil && !profile.supporterGiftPermanent ? ` until ${profile.supporterGiftUntil.toLocaleDateString("en-GB", { timeZone: "UTC" })}` : " until the gift is revoked"}. A gift never creates a charge or changes a subscription.`,
          actions:
            profile?.stripeCustomerId && configured ? (
              <SupporterActions region={region} mode="manage" />
            ) : (
              free
            ),
        }
      : !configured
        ? {
            title: (
              <>
                Supporter is not on sale <em>yet</em>
              </>
            ),
            line: "The plan will bring no advertising and a Team workspace for your guild. Billing is not switched on, so nobody is charged and nothing is locked. Sign in now and the plan can join your account when it launches.",
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
              line: `No advertising and a Team workspace for your guild${price ? `, for ${price}` : ""}. The plan lives on your Outpost account, so sign in first.`,
              actions: signIn,
            }
          : supporter
            ? {
                title: (
                  <>
                    You are a <em>Supporter</em>
                  </>
                ),
                line: `Thank you. ${renews ? `Your plan renews on ${renews}.` : "Your plan is active."}${profile.planStatus === "past_due" ? " The last payment failed; update your card to keep the plan." : ""} Change the card, get invoices or cancel in Stripe's billing portal.`,
                actions: <SupporterActions region={region} mode="manage" />,
              }
            : params.checkout === "success"
              ? {
                  title: (
                    <>
                      Almost <em>there</em>
                    </>
                  ),
                  line: "Stripe confirmed your payment. The plan reaches your account as soon as the confirmation arrives, usually within a minute; reload this page to check.",
                  actions: free,
                }
              : {
                  title: (
                    <>
                      Become a <em>Supporter</em>
                    </>
                  ),
                  line: `No advertising and a Team workspace for your guild${price ? `, for ${price}` : ""}. Cancel any time; checkout happens on Stripe.`,
                  actions: <SupporterActions region={region} mode="subscribe" />,
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
        {configured && !launch && (
          <span className="supporter-note">
            <Lock size={14} aria-hidden="true" /> Outpost never sees your card.
          </span>
        )}
      </SupporterBand>
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
              : "Two things, and nothing else changes: every tool, price and guide stays free."
          }
        />
        <div className="supporter-grid">
          <article className={`raised landing-window ${windows.window}`} data-scene="market">
            <div className={`landing-window-bar ${windows.bar}`}>
              <h3 className="landing-window-title">Run your Team</h3>
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
                  {launch ? "Every account is a Supporter" : "Only the owner needs the plan"}
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
                title="Free, with no ads"
                line="Outpost shows no advertising and takes no payment."
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
                title="No advertising"
                line="Ad slots disappear from every page for the account that holds the plan."
              />
              <ul className="supporter-points">
                <li className="well">Market, calculators and build pages without ad units</li>
                <li className="well">On every device you sign in on</li>
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
                <li className="well">Cancel any time in Stripe&apos;s portal</li>
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
