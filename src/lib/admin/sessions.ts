import { db, databaseService } from "../db";
import { Prisma } from "../prisma-runtime";
import { accountBanned } from "./policy";
/** Read the current account and Discord ban together. A ban also wins a concurrent signup,
 * even if its new account/session was created after the ban revoked existing sessions. */
async function localActiveSession(token: string) {
  if (!token || token.length > 256) return null;
  return db.$transaction(
    async (tx) => {
      const record = await tx.session.findUnique({
        where: { sessionToken: token },
        include: {
          user: {
            include: {
              accounts: { where: { provider: "discord" }, select: { providerAccountId: true } },
            },
          },
        },
      });
      if (!record) return null;
      if (record.expires.getTime() <= Date.now() || accountBanned(record.user)) {
        await tx.session.deleteMany({ where: { id: record.id } });
        return null;
      }
      const ids = record.user.accounts.map((account) => account.providerAccountId);
      if (
        ids.length &&
        (await tx.discordBan.findFirst({
          where: {
            discordId: { in: ids },
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: { discordId: true },
        }))
      ) {
        await tx.session.deleteMany({ where: { id: record.id } });
        return null;
      }
      const { user: linked, ...session } = record;
      const { accounts: links, ...user } = linked;
      void links;
      return { user, session };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export const activeSession: typeof localActiveSession = (...args) =>
  databaseService("activeSession", args) ?? localActiveSession(...args);

import { HttpError } from "../http-error";
import { retrySerialization } from "../serialization-retry";
import { z } from "zod";
const newSession = z
  .object({
    userId: z.string().min(1).max(100),
    sessionToken: z.string().min(16).max(256),
    expires: z.coerce.date(),
  })
  .strict();
/** Called by the OAuth adapter after provider verification, never by a public session API.
 * Creation and current identity-ban checks serialize with ban/session revocation. */
async function localCreateActiveSession(input: {
  userId: string;
  sessionToken: string;
  expires: Date;
}) {
  const value = newSession.parse(input);
  return retrySerialization(() =>
    db.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: value.userId },
          select: {
            bannedAt: true,
            bannedUntil: true,
            accounts: { where: { provider: "discord" }, select: { providerAccountId: true } },
          },
        });
        if (!user || accountBanned(user))
          throw new HttpError(403, "Sign-in is unavailable for this account");
        const ids = user.accounts.map((a) => a.providerAccountId);
        if (
          ids.length &&
          (await tx.discordBan.findFirst({
            where: {
              discordId: { in: ids },
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: { discordId: true },
          }))
        )
          throw new HttpError(403, "Sign-in is unavailable for this account");
        return tx.session.create({ data: value });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
}
export const createActiveSession: typeof localCreateActiveSession = (...args) =>
  databaseService("createActiveSession", args) ?? localCreateActiveSession(...args);
