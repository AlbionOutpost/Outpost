import Link from "@/components/link";
import { ArrowRight } from "lucide-react";
import { adminPageActor } from "@/lib/admin/page-access";
import { adminOverview } from "@/lib/admin/queries";
import { AdminFrame } from "@/components/admin-frame";
import { AdminTrend } from "@/components/admin-trend";
import { AdminAuditRows } from "@/components/admin-audit";
import { AnimatedNumber } from "@/components/animated-number";
import { PanelHead } from "@/components/panel-head";
import { AdminNextSteps } from "@/components/admin-next";
export default async function AdminOverviewPage() {
  const data = await adminOverview(await adminPageActor());
  const stats = [
    { label: "Registered accounts", value: data.counts.users, href: "/admin/users" },
    { label: "Supporters", value: data.counts.supporters, href: "/admin/users?filter=supporters" },
    { label: "Open reports", value: data.counts.openReports, href: "/admin/reports" },
    {
      label: "Banned accounts",
      value: data.counts.bannedUsers,
      href: "/admin/users?filter=banned",
    },
  ];
  return (
    <AdminFrame
      title="Admin overview"
      accent="overview"
      description="Accounts, content and every access change in one place."
      emblem="team-announce"
      actions={
        <Link href="/admin/users" className="button primary">
          Manage users <ArrowRight size={16} aria-hidden="true" />
        </Link>
      }
      closing={
        <AdminNextSteps
          id="admin-next"
          title={
            <>
              Work the <em>queues</em>
            </>
          }
          line="Accounts, reports and the record of every change."
          cards={[
            {
              href: "/admin/users",
              title: "Users & access",
              line: "Find an account, gift Supporter or close its sessions.",
            },
            {
              href: "/admin/reports",
              title: "Content reports",
              line: "Hide, restore or resolve what players reported.",
            },
            {
              href: "/admin/audit",
              title: "Audit trail",
              line: "Read who changed access and the reason they gave.",
            },
          ]}
        />
      }
    >
      <ul className="admin-stats" aria-label="Totals">
        {stats.map(({ label, value, href }) => (
          <li key={label}>
            <Link href={href} className="well">
              <span>{label}</span>
              <strong>
                <AnimatedNumber value={value} />
              </strong>
            </Link>
          </li>
        ))}
      </ul>
      <div className="admin-overview-grid">
        <AdminTrend data={data.trend} limited={data.chartLimited} />
        <section className="panel" aria-labelledby="admin-across">
          <PanelHead
            id="admin-across"
            title={
              <>
                Across <em>Outpost</em>
              </>
            }
            line="Stored records, not website visits."
          />
          <dl className="admin-figures">
            {[
              ["Player builds", data.counts.builds],
              ["Party comps", data.counts.comps],
              ["Team workspaces", data.counts.teams],
              ["Unexpired sessions", data.counts.sessions],
            ].map(([label, value]) => (
              <div key={label} className="well">
                <dt>{label}</dt>
                <dd>{Number(value).toLocaleString("en-GB")}</dd>
              </div>
            ))}
          </dl>
          <p className="admin-foot">
            Supporters include active gifts and subscription entitlements.
          </p>
          <Link href="/admin/review" className="pill-link">
            Review account signals <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </div>
      <section className="panel" aria-labelledby="admin-recent">
        <PanelHead
          id="admin-recent"
          title={
            <>
              Recent admin <em>activity</em>
            </>
          }
          line="Every access change leaves a record."
          actions={
            <Link href="/admin/audit" className="pill-link">
              Full audit trail <ArrowRight size={15} aria-hidden="true" />
            </Link>
          }
        />
        <AdminAuditRows rows={data.audit} />
      </section>
      <p className="admin-freshness">
        Snapshot {new Date(data.asOf).toLocaleString("en-GB", { timeZone: "UTC" })} UTC. Reload the
        page for current values.
      </p>
    </AdminFrame>
  );
}
