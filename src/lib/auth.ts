import type { NextAuthOptions } from "next-auth";
import type { AdapterAccount, AdapterUser } from "next-auth/adapters";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
import { grantOwnerAdmin, promoteOwnerOnce } from "./owner-admin";
import { activeSession, createActiveSession } from "./admin/sessions";
import { discordBanned } from "./admin/access";
import { cleanDisplayName, reservedDisplayName } from "./display-name";
const adapter = PrismaAdapter(db);
export const authOptions: NextAuthOptions = {
  adapter: {
    ...adapter,
    // Outpost never calls Discord on the player's behalf, so provider tokens are not kept:
    // a database or backup leak must not hand out live Discord access.
    linkAccount: (account: AdapterAccount) =>
      adapter.linkAccount!({
        ...account,
        access_token: undefined,
        refresh_token: undefined,
        id_token: undefined,
      }),
    // A new account takes its Discord name cleaned; one that reads as Outpost or its staff
    // (or has no visible letters) starts unnamed and shows as "Adventurer" until changed.
    createUser: (user: Parameters<NonNullable<typeof adapter.createUser>>[0]) => {
      const name = cleanDisplayName(user.name);
      return adapter.createUser!({
        ...user,
        name: name && !reservedDisplayName(name) ? name : null,
      });
    },
    createSession: createActiveSession,
    async getSessionAndUser(token) {
      const result = await activeSession(token);
      // Prisma's nullable email is supported by the existing adapter at runtime.
      return result ? { session: result.session, user: result.user as AdapterUser } : null;
    },
  },
  pages: { signIn: "/signin" },
  session: { strategy: "database", maxAge: 60 * 60 * 24 * 14 },
  providers:
    process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
      ? [
          Discord({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            // Discord returns iss=https://discord.com on the callback (RFC 9207); the OAuth
            // client rejects it unless the provider names the same issuer.
            issuer: "https://discord.com",
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
    async signIn({ account }) {
      return account?.provider === "discord" && !(await discordBanned(account.providerAccountId));
    },
    async session({ session, user }) {
      if (!("role" in user) || user.role !== "ADMIN") await promoteOwnerOnce(user.id);
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
};
