import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireModerator } from "@/lib/community/access";
import { ModerationQueue } from "@/components/moderation-queue";
export const metadata = privateMetadata("Moderation");
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
      <header className="admin-heading">
        <div>
          <h1>Community reports</h1>
          <p>Review player reports and hide, restore or resolve content with a recorded reason.</p>
        </div>
      </header>
      <div className="admin-surface">
        <ModerationQueue />
      </div>
    </div>
  );
}
