import { db, databaseService } from "./db";

/**
 * Public counts shown on the landing page. Only what is measured:
 * - players active this month: distinct accounts with a sign-in session used in the last 30
 *   days. Sessions last 14 days and are renewed at most daily on use, so a session still valid
 *   16 days ago was used within the last 30. Visitors who never sign in are not counted.
 * - Supporters: accounts on the Supporter plan (written only by the Stripe webhook).
 */
export type SiteStats = { monthlyPlayers: number; supporters: number };
async function localSiteStats(): Promise<SiteStats> {
  const since = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000);
  const [active, supporters] = await Promise.all([
    db.session.findMany({
      where: { expires: { gte: since } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    db.user.count({ where: { plan: "SUPPORTER" } }),
  ]);
  return { monthlyPlayers: active.length, supporters };
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
