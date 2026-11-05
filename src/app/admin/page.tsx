import Link from "@/components/link";
import { Users, ShieldAlert, Heart, Flag, ArrowUpRight } from "lucide-react";
import { adminPageActor } from "@/lib/admin/page-access";
import { adminOverview } from "@/lib/admin/queries";
import { AdminTrend } from "@/components/admin-trend";
import { AdminAuditRows } from "@/components/admin-audit";
import { AnimatedNumber } from "@/components/animated-number";
export default async function AdminOverviewPage() {
  const data = await adminOverview(await adminPageActor());
  const stats = [
    { label: "Registered accounts", value: data.counts.users, Icon: Users, href: "/admin/users" },
    {
      label: "Supporters",
      value: data.counts.supporters,
      Icon: Heart,
      href: "/admin/users?filter=supporters",
    },
    { label: "Open reports", value: data.counts.openReports, Icon: Flag, href: "/admin/reports" },
    {
      label: "Banned accounts",
      value: data.counts.bannedUsers,
      Icon: ShieldAlert,
      href: "/admin/users?filter=banned",
    },
  ];
  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Administration</h1>
          <p>A clear view of the community. A considered action when it needs one.</p>
        </div>
        <Link href="/admin/users" className="button primary">
          Manage users <ArrowUpRight size={17} />
        </Link>
      </header>
      <div className="admin-metric-strip">
        {stats.map(({ label, value, Icon, href }) => (
          <Link href={href} key={label}>
            <span>
              <Icon size={17} />
              {label}
            </span>
            <strong>
              <AnimatedNumber value={value} />
            </strong>
          </Link>
        ))}
      </div>
      <div className="admin-overview-grid">
        <AdminTrend data={data.trend} limited={data.chartLimited} />
        <section className="admin-surface admin-community">
          <h2>Across Outpost</h2>
          <dl>
            {[
              ["Player builds", data.counts.builds],
              ["Party comps", data.counts.comps],
              ["Team workspaces", data.counts.teams],
              ["Unexpired sessions", data.counts.sessions],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{Number(value).toLocaleString()}</dd>
              </div>
            ))}
          </dl>
          <p>
            These are stored account and content records, not website visits. Supporters include
            active gifts and subscription entitlements.
          </p>
          <Link href="/admin/review" className="admin-text-link">
            Review account signals <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <section className="admin-surface">
        <div className="admin-section-head">
          <div>
            <h2>Recent administrative activity</h2>
            <p>Every access change leaves a record.</p>
          </div>
          <Link href="/admin/audit" className="admin-text-link">
            Full audit trail <ArrowUpRight size={15} />
          </Link>
        </div>
        <AdminAuditRows rows={data.audit} />
      </section>
      <p className="admin-freshness">
        Snapshot {new Date(data.asOf).toLocaleString("en-GB", { timeZone: "UTC" })} UTC · Refresh
        the page for current values.
      </p>
    </>
  );
}
