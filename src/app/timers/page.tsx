import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
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
      <h1 className="page-title display-title">Personal timers</h1>
      <p className="intro">
        Track your own cooldowns and reminders. Timers are saved to your account; this page shows
        your 100 most recent.
      </p>
      <TimerManager
        initial={timers.map((t) => ({ ...t, dueAt: t.dueAt?.toISOString() ?? null }))}
      />
    </>
  );
}
