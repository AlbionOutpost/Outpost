import Link from "@/components/link";
import { ArrowRight, Check } from "lucide-react";
import { adminPageActor } from "@/lib/admin/page-access";
import { adminOverview, adminReview, adminUsers } from "@/lib/admin/queries";
import { isSupporter } from "@/lib/billing/plan";
import { accountBanned } from "@/lib/admin/policy";
import { AdminFrame } from "@/components/admin-frame";
import { AdminTrend } from "@/components/admin-trend";
import { AdminAuditRows } from "@/components/admin-audit";
import { AdminChip, roleLabel } from "@/components/admin-chip";
import { PanelHead } from "@/components/panel-head";
import { SearchInput } from "@/components/field";

const date = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });

/**
 * The operator console: what needs a decision now (open reports, flagged accounts) first, then
 * the totals in one compact strip, the last 30 days beside the newest accounts, and the most
 * recent access changes. The rail holds the section links, so the page repeats none of them.
 */
export default async function AdminOverviewPage() {
  const actor = await adminPageActor();
  const [data, review, signups] = await Promise.all([
    adminOverview(actor),
    adminReview(actor),
    adminUsers(actor, { q: "", page: "1", filter: "all" }),
  ]);
  const open = data.counts.openReports,
    flagged = review.users.length;
  const totals = [
    ["Accounts", data.counts.users, "/admin/users"],
    ["Builds", data.counts.builds],
    ["Comps", data.counts.comps],
    ["Teams", data.counts.teams],
    ["Supporters", data.counts.supporters, "/admin/users?filter=supporters"],
    ["Banned", data.counts.bannedUsers, "/admin/users?filter=banned"],
    ["Live sessions", data.counts.sessions],
  ] as const;
  return (
    <AdminFrame
      title="Admin overview"
      accent="overview"
      description="Reports and flagged accounts first, then how Outpost is growing."
      emblem="team-announce"
      actions={
        <div className="admin-quick">
          <form action="/admin/users" method="get" role="search" className="admin-quick-search">
            <label htmlFor="admin-find" className="sr-only">
              Find an account
            </label>
            <SearchInput
              id="admin-find"
              name="q"
              maxLength={80}
              placeholder="Find an account: name or Discord ID"
            />
          </form>
        </div>
      }
    >
      <section className="panel admin-attention" aria-labelledby="admin-attention">
        <PanelHead
          id="admin-attention"
          title={
            <>
              Needs <em>attention</em>
            </>
          }
          line={
            open || flagged
              ? "Work the reports first; flagged accounts are signals to look at, not verdicts."
              : "Nothing is waiting for a decision."
          }
        />
        <div className="admin-queues">
          <Link href="/admin/reports" className="well" data-waiting={open > 0 || undefined}>
            <strong>{open.toLocaleString("en-GB")}</strong>
            <span>
              Open {open === 1 ? "report" : "reports"}
              <small>Builds, comps and comments players flagged</small>
            </span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/admin/review" className="well" data-waiting={flagged > 0 || undefined}>
            <strong>
              {flagged.toLocaleString("en-GB")}
              {review.limited ? "+" : ""}
            </strong>
            <span>
              Flagged {flagged === 1 ? "account" : "accounts"}
              <small>Open reports, many sessions or a posting burst</small>
            </span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {flagged > 0 ? (
          <ul className="admin-review-list is-short">
            {review.users.slice(0, 4).map((u) => (
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
                  {Date.parse(review.asOf) - new Date(u.createdAt).getTime() < 86400000 &&
                    u._count.comments >= 20 && (
                      <AdminChip tone="warn">{u._count.comments} comments, new account</AdminChip>
                    )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          !open && (
            <p className="admin-clear well">
              <Check size={16} aria-hidden="true" /> No open reports and no flagged accounts.
            </p>
          )
        )}
      </section>
      <dl className="raised admin-totals" aria-label="Totals">
        {totals.map(([label, value, href]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {href ? (
                <Link href={href}>{value.toLocaleString("en-GB")}</Link>
              ) : (
                value.toLocaleString("en-GB")
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="admin-overview-grid">
        <AdminTrend data={data.trend} limited={data.chartLimited} />
        <section className="panel admin-newest" aria-labelledby="admin-signups">
          <PanelHead
            id="admin-signups"
            title={
              <>
                Newest <em>accounts</em>
              </>
            }
            line="Signed up most recently."
          />
          <ul className="admin-signups">
            {signups.rows.slice(0, 6).map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="admin-user-name">
                  {u.name || "Unnamed account"}
                </Link>
                {(accountBanned(u) || u.role !== "USER" || isSupporter(u)) && (
                  <AdminChip
                    tone={accountBanned(u) ? "danger" : u.role !== "USER" ? "warn" : "accent"}
                  >
                    {accountBanned(u)
                      ? "Banned"
                      : u.role !== "USER"
                        ? roleLabel(u.role)
                        : "Supporter"}
                  </AdminChip>
                )}
                <small>
                  {u._count.builds} {u._count.builds === 1 ? "build" : "builds"} ·{" "}
                  {u._count.compositions} {u._count.compositions === 1 ? "comp" : "comps"}
                </small>
                <time dateTime={new Date(u.createdAt).toISOString()}>{date(u.createdAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="panel admin-recent" aria-labelledby="admin-recent">
        <PanelHead
          id="admin-recent"
          title={
            <>
              Recent access <em>changes</em>
            </>
          }
          line={
            data.audit.length
              ? "Gifts, bans and session changes, with who made them and why."
              : "No gifts, bans or session changes recorded yet."
          }
        />
        {data.audit.length > 0 && <AdminAuditRows rows={data.audit} variant="compact" />}
      </section>
      <p className="admin-freshness">
        Snapshot {new Date(data.asOf).toLocaleString("en-GB", { timeZone: "UTC" })} UTC. Reload the
        page for current values.
      </p>
    </AdminFrame>
  );
}
