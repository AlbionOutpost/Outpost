import Link from "@/components/link";
import { ShieldAlert, ArrowUpRight } from "lucide-react";
import { adminPageActor } from "@/lib/admin/page-access";
import { adminReview } from "@/lib/admin/queries";
export default async function AdminReviewPage() {
  const data = await adminReview(await adminPageActor());
  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Account review</h1>
          <p>Understand unusual activity before making an access decision.</p>
        </div>
        <ShieldAlert size={26} aria-hidden="true" />
      </header>
      <section className="admin-surface">
        <h2>How accounts appear here</h2>
        <p>
          Open reports on their content; eight or more unexpired sessions; or at least 20 comments
          in the last 24 hours from an account less than a day old. These are review signals, not a
          verdict. No automatic bans are applied.
        </p>
        <p>No IP history, device fingerprints or inferred fraud scores are used.</p>
      </section>
      <section className="admin-surface">
        <div className="admin-section-head">
          <h2>{data.users.length} accounts to review</h2>
          <Link href="/admin/reports" className="admin-text-link">
            Content reports <ArrowUpRight size={15} />
          </Link>
        </div>
        {data.limited && (
          <p className="admin-notice">
            Showing up to 50 accounts, using up to 100 session and posting-volume candidates. Use
            user search and content reports for a wider review.
          </p>
        )}
        {data.users.length ? (
          <ul className="admin-review-list">
            {data.users.map((u) => (
              <li key={u.id}>
                <div>
                  <Link href={`/admin/users/${u.id}`} className="admin-user-name">
                    {u.name || "Unnamed account"}
                  </Link>
                  <p>
                    <code>{u.accounts[0]?.providerAccountId || u.id}</code>
                  </p>
                  <div className="admin-tabs">
                    {u.openReports > 0 && (
                      <span className="admin-status">{u.openReports} open reports</span>
                    )}
                    {u._count.sessions >= 8 && (
                      <span className="admin-status">{u._count.sessions} unexpired sessions</span>
                    )}
                    {Date.parse(data.asOf) - new Date(u.createdAt).getTime() < 86400000 &&
                      u._count.comments >= 20 && (
                        <span className="admin-status">
                          {u._count.comments} comments · new account
                        </span>
                      )}
                  </div>
                </div>
                <Link href={`/admin/users/${u.id}`} className="button secondary">
                  Review account <ArrowUpRight size={16} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="admin-empty">
            <h3>No accounts meet these review signals</h3>
            <p>New reports or unusual activity will appear when you refresh.</p>
          </div>
        )}
      </section>
      <p className="admin-freshness">
        Snapshot {new Date(data.asOf).toLocaleString("en-GB", { timeZone: "UTC" })} UTC.
      </p>
    </>
  );
}
