"use client";
import { DiscordMark } from "./discord-mark";
import { signIn, signOut } from "next-auth/react";
import { safeSignInReturn } from "@/lib/sign-in-return";
import { accountBuildDrafts, accountLogoutEvent } from "@/lib/account-build-drafts";
export function LoginButton({ callbackUrl = "/settings" }: { callbackUrl?: string }) {
  return (
    <button
      className="button primary"
      onClick={() => signIn("discord", { callbackUrl: safeSignInReturn(callbackUrl) })}
    >
      <DiscordMark /> Continue with Discord
    </button>
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
