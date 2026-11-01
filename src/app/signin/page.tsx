import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Bookmark, ChevronRight, Layers3, ShieldCheck, Users } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { LoginButton } from "@/components/login-button";
import { SignInError } from "@/components/sign-in-error";
import { safeSignInPageReturn } from "@/lib/sign-in-return";
import Link from "@/components/link";
export const metadata = { title: "Sign in" };
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
      ? "your composition"
      : callbackUrl.startsWith("/builds")
        ? "your loadout"
        : callbackUrl.startsWith("/groups")
          ? "your team workspace"
          : "your dashboard";
  const configured = !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
  return (
    <div className="signin-page support-signin">
      <div className="signin-introduction">
        <div className="signin-brand-symbol" aria-hidden="true">
          <ShieldCheck size={40} />
        </div>
        <h1>
          Make yourself
          <br />
          <span>at home in Outpost.</span>
        </h1>
        <p>Keep your loadouts close and your team ready for the next run.</p>
        <ul>
          <li>
            <Layers3 aria-hidden="true" />
            <div>
              <strong>Your builds, ready to go</strong>
              <span>Save revisions, equipment swaps and party plans.</span>
            </div>
          </li>
          <li>
            <Bookmark aria-hidden="true" />
            <div>
              <strong>A place for your favorites</strong>
              <span>Keep useful builds and comps in your account.</span>
            </div>
          </li>
          <li>
            <Users aria-hidden="true" />
            <div>
              <strong>Bring your team together</strong>
              <span>Invite your members and coordinate your next session.</span>
            </div>
          </li>
        </ul>
      </div>
      <section className="raised signin-panel" aria-labelledby="signin-title">
        <div className="signin-panel-top">
          <ShieldCheck size={23} aria-hidden="true" />
          <span>OUTPOST ACCOUNT</span>
        </div>
        <h2 id="signin-title">Continue with Discord</h2>
        <p>Use your Discord account to save your plans and join your team.</p>
        <p className="signin-return-context">After sign-in, continue to {destination}.</p>
        <SignInError error={params.error} />
        {configured ? (
          <LoginButton callbackUrl={callbackUrl} />
        ) : (
          <div className="signin-unavailable" role="status">
            <strong>Sign-in is temporarily unavailable</strong>
            <p>Your public tools and device drafts still work. Try again later.</p>
          </div>
        )}
        <div className="signin-permissions">
          <ShieldCheck size={17} aria-hidden="true" />
          <p>
            We request your Discord identity and email only. No server permissions or external
            notifications. Discord sign-in does not verify an Albion character.
          </p>
        </div>
        <Link className="signin-guest-link" href="/tools">
          Explore without an account <ChevronRight size={16} />
        </Link>
        <p className="signin-legal">
          By continuing, review our <Link href="/legal">privacy & terms</Link>.
        </p>
      </section>
    </div>
  );
}
