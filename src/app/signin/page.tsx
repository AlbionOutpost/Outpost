import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { LoginButton } from "@/components/login-button";
import { signInErrorMessage } from "@/lib/sign-in-error";
import { PanelHead } from "@/components/panel-head";
import { safeSignInPageReturn } from "@/lib/sign-in-return";
import Link from "@/components/link";
import { NextStepCards } from "@/components/next-step-cards";
import styles from "@/components/account.module.css";
export const metadata = privateMetadata("Sign in");

const benefits = [
  [
    "strip-builds",
    "Your builds, with every revision",
    "Save loadouts, swaps and spells; go back to any version.",
  ],
  ["strip-comps", "Comps your party can open", "Share a comp by link, or keep it to your Team."],
  ["team-roles", "A Team for your guild", "Events with RSVPs, shared sets and loot splits."],
] as const;

export default async function Signin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    callbackUrl = safeSignInPageReturn(params.callbackUrl, process.env.NEXTAUTH_URL);
  if (await getServerSession(authOptions)) redirect(callbackUrl);
  const destination = callbackUrl.startsWith("/invitations/")
    ? "your team invitation"
    : callbackUrl.startsWith("/compositions")
      ? "your comp"
      : callbackUrl.startsWith("/builds")
        ? "your loadout"
        : callbackUrl.startsWith("/groups")
          ? "your team workspace"
          : "your dashboard";
  const configured = !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
  const error = signInErrorMessage(params.error);
  const retry = `/signin?${new URLSearchParams({ callbackUrl })}`;
  return (
    <div className={styles.signin} data-signin="">
      <div className={styles.signinCopy}>
        <h1 className={styles.signinTitle}>
          Save your <em>builds</em> and bring your team
        </h1>
        <p className={styles.signinLede}>
          Every tool works without an account. Sign in with Discord to keep what you make and plan
          with your guild.
        </p>
      </div>
      <ul className={styles.benefits}>
        {benefits.map(([emblem, title, line]) => (
          <li key={emblem} className="well">
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
            <img src={`/albion/icons/${emblem}.webp`} alt="" width={44} height={44} />
            <span>
              <strong>{title}</strong>
              <small>{line}</small>
            </span>
          </li>
        ))}
      </ul>
      <section
        className={`panel ${styles.panel} ${styles.signinPanel}`}
        aria-labelledby="signin-title"
      >
        <PanelHead
          id="signin-title"
          title="Continue with Discord"
          line={`After sign-in you go straight to ${destination}.`}
        />
        {/* Said once: the failed attempt if there was one, otherwise that sign-in is off */}
        {error || !configured ? (
          <div
            className={`well ${styles.unavailable}`}
            role={error ? "alert" : "status"}
            data-tone="error"
          >
            <strong>{error ? "Sign-in did not finish" : "Sign-in is unavailable right now"}</strong>
            <p>{error ?? "Public tools and device drafts still work. Try again later."}</p>
            <Link className="pill-link is-small" href={retry}>
              <RotateCcw size={14} aria-hidden="true" /> Retry
            </Link>
          </div>
        ) : null}
        {configured && <LoginButton callbackUrl={callbackUrl} />}
        <p className={styles.signinNote}>
          Outpost asks Discord for your name, picture and email only: no server permissions, no
          messages. It does not check your Albion character.
        </p>
        <div className={styles.signinFoot}>
          <Link className="pill-link is-small" href="/tools">
            Explore without an account <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <Link className="pill-link is-small" href="/legal">
            Privacy &amp; terms
          </Link>
        </div>
      </section>
      <div className={styles.signinNext}>
        <NextStepCards
          id="signin-next"
          title={
            <>
              Or start <em>without</em> an account
            </>
          }
          line="Prices, calculators and the build library are open to everyone."
          cards={[
            {
              href: "/tools/market",
              emblem: "tool-market",
              title: "Market Explorer",
              line: "Prices in every city.",
              scene: "market",
            },
            {
              href: "/tools/crafting",
              emblem: "tool-craft",
              title: "Crafting Calculator",
              line: "See if a craft makes silver.",
              scene: "build",
            },
            {
              href: "/builds/library",
              emblem: "strip-builds",
              title: "Build library",
              line: "Recorded builds by activity.",
              scene: "city",
            },
          ]}
        />
      </div>
    </div>
  );
}
