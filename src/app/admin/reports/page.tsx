import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireModerator } from "@/lib/community/access";
import { AdminFrame } from "@/components/admin-frame";
import { AdminReports } from "@/components/admin-reports";
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
    <AdminFrame
      title="Community reports"
      accent="reports"
      description="Review what players reported, then hide, restore or resolve it with a recorded reason."
      emblem="admin-reports"
    >
      <AdminReports />
    </AdminFrame>
  );
}
