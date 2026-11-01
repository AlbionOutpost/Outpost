import { db } from "./db";
type VerifiedAccount = { provider: string; providerAccountId: string } | null;

/** Called only after NextAuth completes provider verification and persists the account link.
 * A claimed request ID, profile name or email never grants a role.
 */
export async function grantOwnerAdmin(userId: string, account: VerifiedAccount) {
  const owner = process.env.OUTPOST_OWNER_DISCORD_ID;
  if (
    !owner ||
    !/^\d{17,20}$/.test(owner) ||
    account?.provider !== "discord" ||
    account.providerAccountId !== owner
  )
    return;
  await promotePersistedOwner(userId);
}

/** Existing authenticated sessions may predate the configured owner. The persisted provider
 * link, rather than any session/client role claim, remains the authority for this promotion.
 */
export async function promotePersistedOwner(userId: string) {
  const owner = process.env.OUTPOST_OWNER_DISCORD_ID;
  if (!owner || !/^\d{17,20}$/.test(owner)) return;
  await db.user.updateMany({
    where: {
      id: userId,
      role: { not: "ADMIN" },
      accounts: { some: { provider: "discord", providerAccountId: owner } },
    },
    data: { role: "ADMIN" },
  });
}
