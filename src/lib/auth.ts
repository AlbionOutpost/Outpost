import type { NextAuthOptions } from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "./db";
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
  callbacks: {
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
};
