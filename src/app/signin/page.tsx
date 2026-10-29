import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { LoginButton } from "@/components/login-button";
import { safeSignInReturn } from "@/lib/sign-in-return";
import Link from "@/components/link";
export default async function Signin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    callbackUrl = safeSignInReturn(params.callbackUrl);
  if (await getServerSession(authOptions)) redirect(callbackUrl);
  const configured = !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
  return (
    <section className="panel prose">
      <h1>Continue with Discord</h1>
      <p>
        Save your profile and selected Albion region. Your Discord identity does not verify
        ownership of an Albion character.
      </p>
      {configured ? (
        <LoginButton callbackUrl={callbackUrl} />
      ) : (
        <p role="status">
          Discord sign-in is unavailable right now. You can still browse builds and use the public
          tools.
        </p>
      )}
      <Link className="button secondary" href="/tools">
        Browse tools
      </Link>
      <p>
        We request your Discord identity and email only. No guild permissions or external
        notifications.
      </p>
    </section>
  );
}
