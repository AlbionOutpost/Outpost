import Link from "@/components/link";
import { adminPageActor } from "@/lib/admin/page-access";
import { adminAuditLog } from "@/lib/admin/queries";
import { AdminAuditRows } from "@/components/admin-audit";
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.min(1000, Math.max(1, parseInt(params.page || "1", 10) || 1));
  const data = await adminAuditLog(await adminPageActor(), page);
  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Audit trail</h1>
          <p>Who changed access, what they changed and the reason they recorded.</p>
        </div>
      </header>
      <section className="admin-surface">
        <AdminAuditRows rows={data.rows} />
        <nav className="admin-pagination" aria-label="Audit pages">
          {page > 1 ? (
            <Link href={`/admin/audit?page=${page - 1}`}>Previous</Link>
          ) : (
            <span>Previous</span>
          )}
          <span>Page {page}</span>
          {page * 25 < data.total ? (
            <Link href={`/admin/audit?page=${page + 1}`}>Next</Link>
          ) : (
            <span>Next</span>
          )}
        </nav>
      </section>
    </>
  );
}
