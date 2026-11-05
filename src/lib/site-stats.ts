import { db, databaseService } from "./db";

/** Public aggregates: registered Outpost accounts and current paid/gift entitlements.
 * Account edits do not imply visits. No traffic/online-user analytics is inferred. */
// Keep the legacy RPC field for compatible web rollbacks; it now counts registered accounts.
export type SiteStats = { monthlyPlayers: number; supporters: number };
async function localSiteStats(): Promise<SiteStats> {
  const [accounts, supporters] = await Promise.all([
    db.user.count(),
    db.user.count({
      where: {
        OR: [
          { plan: "SUPPORTER" },
          { supporterGiftPermanent: true },
          { supporterGiftUntil: { gt: new Date() } },
        ],
      },
    }),
  ]);
  return { monthlyPlayers: accounts, supporters };
}
export const siteStats: typeof localSiteStats = (...args) =>
  databaseService<SiteStats>("siteStats", args) ?? localSiteStats(...args);

let cached: { value: SiteStats; expires: number } | null = null;
/** The counts change slowly; one database request per process every ten minutes is plenty. */
export async function landingStats(): Promise<SiteStats | null> {
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const value = await siteStats();
    cached = { value, expires: Date.now() + 600_000 };
    return value;
  } catch {
    return cached?.value ?? null;
  }
}
