import { db, databaseService } from "./db";

/**
 * Public counts shown on the landing page. Only what is measured:
 * - players active this month: signed-in accounts that opened any page in the last 30 days
 *   (a signed-in visit touches the account's updatedAt at most twice a day, see auth.ts).
 *   Visitors who never sign in are not counted.
 * - Supporters: accounts on the Supporter plan (written only by the Stripe webhook).
 */
export type SiteStats = { monthlyPlayers: number; supporters: number };
async function localSiteStats(): Promise<SiteStats> {
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  // Filtered here rather than in SQL: the account store keeps dates in its own format.
  const [users, supporters] = await Promise.all([
    db.user.findMany({ select: { updatedAt: true } }),
    db.user.count({ where: { plan: "SUPPORTER" } }),
  ]);
  const active = users.filter((u) => new Date(u.updatedAt).getTime() >= since).length;
  return { monthlyPlayers: active, supporters };
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
