import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireModerator } from "@/lib/community/access";
import { ModerationQueue } from "@/components/moderation-queue";
export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/signin");
  try {
    await requireModerator(s.user.id);
  } catch {
    notFound();
  }
  return (
    <div className="support-admin-page">
      <h1 className="page-title display-title">Community reports</h1>
      <p className="intro">
        Every review rechecks your current database role and records an audit entry. Reported
        content is untrusted user text.
      </p>
      <ModerationQueue />
    </div>
  );
}
