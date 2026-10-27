"use client";
import { DiscordMark } from "./discord-mark";
import { signIn, signOut } from "next-auth/react";
export function LoginButton() {
  return (
    <button
      className="button primary discord-login"
      onClick={() => signIn("discord", { callbackUrl: "/settings" })}
    >
      <DiscordMark /> Continue with Discord
    </button>
  );
}
export function LogoutButton() {
  return (
    <button className="button secondary" onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </button>
  );
}
