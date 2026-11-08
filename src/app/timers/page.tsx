import { privateMetadata } from "@/lib/seo";
import { accountPage, accountPageOrder } from "@/lib/account-pagination";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { TimerManager } from "@/components/timer-manager";
import styles from "@/components/account.module.css";
import { signInPath } from "@/lib/sign-in-return";
export const metadata = privateMetadata("Timers");
/** The server clock for the first paint; the page is per-request, so this is the request time. */
const renderedAt = () => Date.now();
export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect(signInPath("/timers"));
  const timers = await db.timer.findMany({
    where: { userId: s.user.id },
    orderBy: [...accountPageOrder],
    take: 101,
  });
  const page = accountPage(timers, 100);
  return (
    <div className={styles.page}>
      <TimerManager
        initialCursor={page.cursor}
        serverNow={renderedAt()}
        initial={page.items.map((t) => ({ ...t, dueAt: t.dueAt?.toISOString() ?? null }))}
      />
    </div>
  );
}
