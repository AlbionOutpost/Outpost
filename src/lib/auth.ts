import type { NextAuthOptions } from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
import { grantOwnerAdmin, promotePersistedOwner } from "./owner-admin";
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  pages: { signIn: "/signin" },
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 14 },
  providers:
    process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
      ? [
          Discord({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            authorization: { params: { scope: "identify email" } },
            checks: ["pkce", "state"],
          }),
        ]
      : [],
  // Sign-in failures are logged with their code and a sanitized cause (never tokens or
  // cookies) so a failed Discord callback can be diagnosed from the Worker logs.
  logger: {
    error(code, metadata) {
      const cause =
        metadata instanceof Error
          ? metadata
          : (metadata as { error?: unknown } | undefined)?.error instanceof Error
            ? (metadata as { error: Error }).error
            : null;
      console.error(
        JSON.stringify({
          event: "auth_error",
          code,
          name: cause?.name,
          message: cause?.message?.replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]").slice(0, 300),
        }),
      );
    },
    warn(code) {
      console.warn(JSON.stringify({ event: "auth_warning", code }));
    },
    debug() {},
  },
  events: {
    async signIn({ user, account }) {
      await grantOwnerAdmin(user.id, account);
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (!("role" in user) || user.role !== "ADMIN") await promotePersistedOwner(user.id);
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
};
