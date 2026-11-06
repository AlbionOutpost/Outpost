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
import { NextStepCards } from "@/components/next-step-cards";
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
  const words = name.trim().split(/\s+/);
  const accent = words.length > 1 ? words[words.length - 1] : undefined;
  const banned = accountBanned(user);
  return (
    <AdminFrame
      title={name}
      accent={accent}
      description={`${discordId ? `Discord ID ${discordId}` : `Account ID ${user.id}`}. Joined ${day(user.createdAt)}.`}
      emblem="team-roles"
      actions={
        <Link href="/admin/users" className="pill-link">
          <ArrowLeft size={15} aria-hidden="true" /> All accounts
        </Link>
      }
      chips={
        <div className="admin-chips">
          <AdminChip tone={banned ? "danger" : isSupporter(user) ? "accent" : "default"}>
            {banned ? "Banned" : isSupporter(user) ? "Supporter" : "Free"}
          </AdminChip>
          {user.role !== "USER" && <AdminChip tone="warn">{roleLabel(user.role)}</AdminChip>}
        </div>
      }
      closing={
        <NextStepCards
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
              emblem: "team-roles",
              title: "All accounts",
              line: "Search by name, Discord ID or account ID.",
            },
            {
              href: "/admin/review",
              emblem: "trophy-silver",
              title: "Account review",
              line: "Other accounts with unusual activity.",
            },
            {
              href: "/admin/audit",
              emblem: "team-calendar",
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
            <dl className="admin-figures">
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
                [
                  "Builds and comps",
                  `${user._count.builds} builds, ${user._count.compositions} comps`,
                ],
                ["Unexpired sessions", String(user._count.sessions)],
              ].map(([label, value]) => (
                <div key={label} className="well">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
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
            {signals.length ? (
              <>
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
              </>
            ) : (
              <p className="admin-foot">
                No open reports, no unusual session count and no burst of posts from a new account.
              </p>
            )}
            {banned && ban && (
              <p className="admin-note well">
                <strong>Ban reason:</strong> {ban.reason}
              </p>
            )}
          </section>
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
