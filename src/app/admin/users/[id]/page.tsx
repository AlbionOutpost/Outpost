import Link from "@/components/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { adminPageActor } from "@/lib/admin/page-access";
import { adminUserDetail } from "@/lib/admin/queries";
import { AdminUserActions } from "@/components/admin-user-actions";
import { AdminAuditRows } from "@/components/admin-audit";
import { AdminFrame } from "@/components/admin-frame";
import { AdminChip, roleLabel } from "@/components/admin-chip";
import { PanelHead } from "@/components/panel-head";
import { AdminNextSteps } from "@/components/admin-next";
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
  const day = (d: Date | string) =>
    new Date(d).toLocaleDateString("en-GB", { timeZone: "UTC", dateStyle: "medium" });
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
  const name = user.name || "Unnamed account";
  const banned = accountBanned(user);
  return (
    <AdminFrame
      title={name}
      description={`${discordId ? `Discord ID ${discordId}` : `Account ID ${user.id}`}. Joined ${day(user.createdAt)}.`}
      emblem="team-roles"
      actions={
        <Link href="/admin/users" className="pill-link">
          <ArrowLeft size={15} aria-hidden="true" /> All accounts
        </Link>
      }
      titleChips={
        <div className="admin-chips">
          <AdminChip tone={banned ? "danger" : isSupporter(user) ? "accent" : "default"}>
            {banned ? "Banned" : isSupporter(user) ? "Supporter" : "Free"}
          </AdminChip>
          {user.role !== "USER" && <AdminChip tone="warn">{roleLabel(user.role)}</AdminChip>}
        </div>
      }
      closing={
        <AdminNextSteps
          id="admin-next"
          title={
            <>
              Back to the <em>queue</em>
            </>
          }
          line="Done with this account? Pick the next one to look at."
          cards={[
            {
              href: "/admin/users",
              title: "All accounts",
              line: "Search by name, Discord ID or account ID.",
            },
            {
              href: "/admin/review",
              title: "Account review",
              line: "Other accounts with unusual activity.",
            },
            {
              href: "/admin/audit",
              title: "Audit trail",
              line: "Confirm your change was recorded.",
            },
          ]}
        />
      }
    >
      <div className="admin-user-grid">
        <div>
          <section className="panel" aria-labelledby="admin-details">
            <PanelHead
              id="admin-details"
              title={
                <>
                  Account <em>details</em>
                </>
              }
              line="What Outpost has recorded for this account."
            />
            <dl className="admin-facts well">
              {[
                ["Email", user.email || "Not provided"],
                ["Joined", day(user.createdAt)],
                ["Plan", isSupporter(user) ? "Supporter" : "Free"],
                [
                  "Gift",
                  giftedSupporter(user)
                    ? user.supporterGiftPermanent
                      ? "Until revoked"
                      : `Until ${day(user.supporterGiftUntil!)}`
                    : "None active",
                ],
                ["Subscription", user.planStatus || "None recorded"],
                ["Builds", String(user._count.builds)],
                ["Comps", String(user._count.compositions)],
                ["Unexpired sessions", String(user._count.sessions)],
                ["Review signals", signals.length ? signals.join("; ") : "None"],
                ...(banned && ban ? [["Ban reason", ban.reason]] : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          {signals.length > 0 && (
            <section className="panel" aria-labelledby="admin-signals">
              <PanelHead
                id="admin-signals"
                title={
                  <>
                    Review <em>signals</em>
                  </>
                }
                line="Context for a manual review. They do not prove abuse or trigger a ban."
              />
              <ul className="admin-chips">
                {signals.map((s) => (
                  <li key={s}>
                    <AdminChip tone="warn">{s}</AdminChip>
                  </li>
                ))}
              </ul>
              <Link href="/admin/reports" className="pill-link">
                Open content reports <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </section>
          )}
          <section className="panel" aria-labelledby="admin-user-audit">
            <PanelHead
              id="admin-user-audit"
              title={
                <>
                  Account <em>history</em>
                </>
              }
              line="The latest admin changes that involve this account."
            />
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
    </AdminFrame>
  );
}
