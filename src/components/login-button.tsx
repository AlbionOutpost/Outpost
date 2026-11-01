"use client";
import { DiscordMark } from "./discord-mark";
import { signOut } from "next-auth/react";
import { useId, useState } from "react";
import { startDiscordSignIn } from "@/lib/discord-sign-in";
import { accountBuildDrafts, accountLogoutEvent } from "@/lib/account-build-drafts";
export function LoginButton({ callbackUrl = "/settings" }: { callbackUrl?: string }) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const errorId = useId();
  async function start() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      window.location.assign(await startDiscordSignIn(callbackUrl, window.location.origin));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Sign-in could not be started. Please try again.",
      );
      setPending(false);
    }
  }
  return (
    <div className="discord-signin-control login-start">
      <button
        type="button"
        className="button primary login-button"
        onClick={() => void start()}
        disabled={pending}
        aria-busy={pending}
        aria-describedby={error ? errorId : undefined}
      >
        <DiscordMark /> {pending ? "Opening Discord…" : "Continue with Discord"}
      </button>
      <p id={errorId} className="signin-error" role="alert" hidden={!error}>
        {error}
      </p>
    </div>
  );
}
export function LogoutButton() {
  return (
    <button
      className="button secondary"
      onClick={() => {
        if (!window.dispatchEvent(new Event(accountLogoutEvent, { cancelable: true }))) return;
        accountBuildDrafts.clear();
        void signOut({ callbackUrl: "/" });
      }}
    >
      Sign out
    </button>
  );
}
