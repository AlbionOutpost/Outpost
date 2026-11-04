import { privateMetadata } from "@/lib/seo";
import { accountPage, accountPageOrder } from "@/lib/account-pagination";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { TimerManager } from "@/components/timer-manager";
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
    <>
      <WorkspaceHeading
        scene="economy"
        title="Personal timers"
        description="Keep your cooldowns and reminders together. Your timers are saved to your account; load older entries whenever you need them."
        icon="timer"
      />
      <TimerManager
        initialCursor={page.cursor}
        initial={page.items.map((t) => ({ ...t, dueAt: t.dueAt?.toISOString() ?? null }))}
      />
    </>
  );
}
