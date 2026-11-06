import { privateMetadata } from "@/lib/seo";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireModerator } from "@/lib/community/access";
import { AdminFrame, adminRole } from "@/components/admin-frame";
import { AdminReports } from "@/components/admin-reports";
import { AdminNextSteps } from "@/components/admin-next";
export const metadata = privateMetadata("Moderation");
export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/signin");
  try {
    await requireModerator(s.user.id);
  } catch {
    notFound();
  }
  const admin = (await adminRole()) === "ADMIN";
  return (
    <AdminFrame
      title="Community reports"
      accent="reports"
      description="Review what players reported, then hide, restore or resolve it with a recorded reason."
      emblem="strip-content"
      closing={
        <AdminNextSteps
          id="admin-next"
          title={
            <>
              More <em>moderation</em>
            </>
          }
          line={
            admin
              ? "Reports point at content. These pages point at the people behind it."
              : "See the content as players see it."
          }
          cards={
            admin
              ? [
                  {
                    href: "/admin/review",
                    title: "Account review",
                    line: "Accounts with open reports or unusual activity.",
                  },
                  {
                    href: "/admin/users",
                    title: "Users & access",
                    line: "Open an author's account and history.",
                  },
                  {
                    href: "/admin/audit",
                    title: "Audit trail",
                    line: "Check an action was recorded.",
                  },
                ]
              : [
                  {
                    href: "/builds/library",
                    title: "Builds library",
                    line: "Browse builds as players see them.",
                  },
                  {
                    href: "/compositions/library",
                    title: "Comps library",
                    line: "Browse shared party comps.",
                  },
                ]
          }
        />
      }
    >
      <AdminReports />
    </AdminFrame>
  );
}
