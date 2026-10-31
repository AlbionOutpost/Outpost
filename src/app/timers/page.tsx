import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { TimerManager } from "@/components/timer-manager";
export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/signin");
  const timers = await db.timer.findMany({
    where: { userId: s.user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return (
    <>
      <WorkspaceHeading
        scene="economy"
        title="Personal timers"
        description="Keep your cooldowns and reminders together. Your 100 most recent timers are saved to your account."
        icon="timer"
      />
      <TimerManager
        initial={timers.map((t) => ({ ...t, dueAt: t.dueAt?.toISOString() ?? null }))}
      />
    </>
  );
}
