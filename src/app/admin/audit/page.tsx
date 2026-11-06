import Link from "@/components/link";
import { adminPageActor } from "@/lib/admin/page-access";
import { adminAuditLog } from "@/lib/admin/queries";
import { AdminAuditRows } from "@/components/admin-audit";
import { AdminFrame } from "@/components/admin-frame";
import { PanelHead } from "@/components/panel-head";
import { AdminNextSteps } from "@/components/admin-next";
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.min(1000, Math.max(1, parseInt(params.page || "1", 10) || 1));
  const data = await adminAuditLog(await adminPageActor(), page);
  return (
    <AdminFrame
      title="Audit trail"
      accent="trail"
      description="Who changed access, what they changed and the reason they recorded."
      emblem="team-calendar"
      closing={
        <AdminNextSteps
          id="admin-next"
          title={
            <>
              Follow up on a <em>change</em>
            </>
          }
          line="Open the account a change touched, or keep working the queues."
          cards={[
            {
              href: "/admin/users",
              title: "Users & access",
              line: "Look up the target by Discord ID or account ID.",
            },
            {
              href: "/admin/reports",
              title: "Content reports",
              line: "Moderation actions also leave a log entry.",
            },
            {
              href: "/admin/review",
              title: "Account review",
              line: "Accounts that may need a decision next.",
            },
          ]}
        />
      }
    >
      <section className="panel" aria-labelledby="admin-audit-title">
        <PanelHead
          id="admin-audit-title"
          title={
            <>
              Recorded <em>changes</em>
            </>
          }
          line={`${data.total.toLocaleString("en-GB")} in total, newest first, 25 to a page.`}
        />
        <AdminAuditRows rows={data.rows} variant="table" />
        {data.total > 25 && (
          <nav className="admin-pagination" aria-label="Audit pages">
            {page > 1 ? (
              <Link href={`/admin/audit?page=${page - 1}`} className="pill-link">
                Previous
              </Link>
            ) : (
              <span className="pill-link" aria-disabled="true">
                Previous
              </span>
            )}
            <span>Page {page}</span>
            {page * 25 < data.total ? (
              <Link href={`/admin/audit?page=${page + 1}`} className="pill-link">
                Next
              </Link>
            ) : (
              <span className="pill-link" aria-disabled="true">
                Next
              </span>
            )}
          </nav>
        )}
      </section>
    </AdminFrame>
  );
}
