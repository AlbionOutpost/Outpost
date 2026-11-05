import "next-auth";
import type { DefaultSession } from "next-auth";
declare module "next-auth" {
  interface User {
    bannedAt?: Date | null;
    bannedUntil?: Date | null;
  }
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
