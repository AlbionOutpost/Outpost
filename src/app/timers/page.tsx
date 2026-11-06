import { privateMetadata } from "@/lib/seo";
import { accountPage, accountPageOrder } from "@/lib/account-pagination";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { TimerManager } from "@/components/timer-manager";
import { NextStepCards } from "@/components/next-step-cards";
import styles from "@/components/account.module.css";
export const metadata = privateMetadata("Timers");
export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/signin");
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
        initial={page.items.map((t) => ({ ...t, dueAt: t.dueAt?.toISOString() ?? null }))}
      />
      <NextStepCards
        id="timers-next"
        title={
          <>
            Make the wait <em>pay</em>
          </>
        }
        line="Work out what the crops, laborers and crafts are worth before the timer runs out."
        cards={[
          {
            href: "/tools/farming",
            emblem: "fame",
            title: "Farming",
            line: "Seeds, yields and what a plot earns.",
            scene: "economy",
          },
          {
            href: "/tools/laborers",
            emblem: "tool-planner",
            title: "Laborers",
            line: "What a full journal brings back.",
            scene: "city",
          },
          {
            href: "/tools/market",
            emblem: "tool-market",
            title: "Market Explorer",
            line: "Sell the harvest in the right city.",
            scene: "market",
          },
        ]}
      />
    </div>
  );
}
