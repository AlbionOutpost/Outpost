import Link from "@/components/link";
import { notFound } from "next/navigation";
import { adminPageActor } from "@/lib/admin/page-access";
import { adminUserDetail } from "@/lib/admin/queries";
import { AdminUserActions } from "@/components/admin-user-actions";
import { AdminAuditRows } from "@/components/admin-audit";
import { isSupporter } from "@/lib/billing/plan";
import { accountBanned, giftedSupporter } from "@/lib/admin/policy";
import { HttpError } from "@/lib/http-error";
export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await adminPageActor();
  let detail;
  try {
    detail = await adminUserDetail(actor, (await params).id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const { user, ban, openReports, audit } = detail;
  const protectedAccount = user.role === "ADMIN" || user.id === actor;
  const discordId = user.accounts[0]?.providerAccountId;
  const signals = [
    ...(openReports
      ? [`${openReports} open content ${openReports === 1 ? "report" : "reports"}`]
      : []),
    ...(user._count.sessions >= 8 ? [`${user._count.sessions} unexpired sessions`] : []),
    ...(Date.parse(detail.asOf) - new Date(user.createdAt).getTime() < 86400000 &&
    user._count.comments >= 20
      ? [`${user._count.comments} comments from an account created within 24 hours`]
      : []),
  ];
  return (
    <>
      <Link href="/admin/users" className="admin-text-link">
        ← All accounts
      </Link>
      <header className="admin-heading">
        <div>
          <h1>{user.name || "Unnamed account"}</h1>
          <p>
            <code>{discordId || user.id}</code>
          </p>
        </div>
        <span className={`admin-status ${accountBanned(user) ? "is-danger" : ""}`}>
          {accountBanned(user)
            ? "Banned"
            : user.role === "ADMIN"
              ? "Administrator"
              : "Active account"}
        </span>
      </header>
      <div className="admin-user-grid">
        <div>
          <section className="admin-surface">
            <h2>Account details</h2>
            <dl className="admin-detail-list">
              {[
                ["Email", user.email || "Not provided"],
                [
                  "Joined",
                  new Date(user.createdAt).toLocaleDateString("en-GB", { timeZone: "UTC" }),
                ],
                ["Plan", isSupporter(user) ? "Supporter" : "Free"],
                [
                  "Gift",
                  giftedSupporter(user)
                    ? user.supporterGiftPermanent
                      ? "Until revoked"
                      : `Until ${new Date(user.supporterGiftUntil!).toLocaleDateString("en-GB", { timeZone: "UTC" })}`
                    : "None active",
                ],
                ["Subscription", user.planStatus || "No subscription recorded"],
                ["Builds / comps", `${user._count.builds} / ${user._count.compositions}`],
                ["Unexpired sessions", String(user._count.sessions)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="admin-surface">
            <h2>Review signals</h2>
            {signals.length ? (
              <>
                <ul className="admin-signals">
                  {signals.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <p>
                  Signals provide context for a manual review. They do not prove abuse or trigger an
                  automatic ban.
                </p>
                <Link href="/admin/reports" className="admin-text-link">
                  Open content reports →
                </Link>
              </>
            ) : (
              <p>
                No review signals from open reports, session counts or new-account posting volume.
              </p>
            )}
            {accountBanned(user) && ban && (
              <p>
                <strong>Ban reason:</strong> {ban.reason}
              </p>
            )}
          </section>
          <section className="admin-surface">
            <h2>Account audit trail</h2>
            <AdminAuditRows rows={audit} />
          </section>
        </div>
        <div className="admin-account-actions">
          <AdminUserActions
            id={user.id}
            updatedAt={user.updatedAt.toISOString()}
            discordId={discordId}
            banVersion={ban?.version || 0}
            banActive={
              !!ban &&
              !ban.revokedAt &&
              (!ban.expiresAt || new Date(ban.expiresAt).getTime() > Date.parse(detail.asOf))
            }
            protectedAccount={protectedAccount}
            hasGift={giftedSupporter(user)}
          />
        </div>
      </div>
    </>
  );
}
