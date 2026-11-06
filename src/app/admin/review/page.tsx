import Link from "@/components/link";
import { ArrowRight } from "lucide-react";
import { adminPageActor } from "@/lib/admin/page-access";
import { adminReview } from "@/lib/admin/queries";
import { AdminFrame } from "@/components/admin-frame";
import { AdminChip } from "@/components/admin-chip";
import { PanelHead } from "@/components/panel-head";
import { EmptyWell } from "@/components/empty-well";
import { Disclosure } from "@/components/disclosure";
export default async function AdminReviewPage() {
  const data = await adminReview(await adminPageActor());
  return (
    <AdminFrame
      title="Account review"
      accent="review"
      description="Look at unusual activity before you make an access decision."
      emblem="admin-review"
    >
      <section className="panel" aria-labelledby="admin-review-list">
        <PanelHead
          id="admin-review-list"
          title={
            <>
              Accounts to <em>review</em>
            </>
          }
          line={`${data.users.length} ${data.users.length === 1 ? "account shows" : "accounts show"} a signal.`}
        />
        {data.limited && (
          <p className="admin-note well">
            Showing up to 50 accounts from up to 100 session and posting candidates. Use user search
            and content reports to look wider.
          </p>
        )}
        {data.users.length ? (
          <ul className="admin-review-list">
            {data.users.map((u) => (
              <li key={u.id} className="well">
                <div className="admin-review-who">
                  <Link href={`/admin/users/${u.id}`} className="admin-user-name">
                    {u.name || "Unnamed account"}
                  </Link>
                  <code>{u.accounts[0]?.providerAccountId || u.id}</code>
                </div>
                <div className="admin-chips">
                  {u.openReports > 0 && (
                    <AdminChip tone="warn">
                      {u.openReports} open {u.openReports === 1 ? "report" : "reports"}
                    </AdminChip>
                  )}
                  {u._count.sessions >= 8 && (
                    <AdminChip tone="warn">{u._count.sessions} unexpired sessions</AdminChip>
                  )}
                  {Date.parse(data.asOf) - new Date(u.createdAt).getTime() < 86400000 &&
                    u._count.comments >= 20 && (
                      <AdminChip tone="warn">{u._count.comments} comments, new account</AdminChip>
                    )}
                </div>
                <Link href={`/admin/users/${u.id}`} className="pill-link is-small">
                  Review account <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyWell
            emblem="admin-review"
            title="No accounts meet these signals"
            line="New reports or unusual activity appear here when you reload."
          />
        )}
        <Disclosure summary="How accounts get listed">
          <p className="admin-foot">
            An account appears with open reports on its content, eight or more unexpired sessions,
            or at least 20 comments in its first day. These are signals, not a verdict, and no ban
            is applied automatically. Outpost uses no IP history, device fingerprints or fraud
            scores.
          </p>
        </Disclosure>
        <p className="admin-freshness">
          Snapshot {new Date(data.asOf).toLocaleString("en-GB", { timeZone: "UTC" })} UTC.
        </p>
      </section>
    </AdminFrame>
  );
}
