import Link from "@/components/link";

import { adminPageActor } from "@/lib/admin/page-access";
import { adminUsers } from "@/lib/admin/queries";
import { isSupporter, supporterLabel } from "@/lib/billing/plan";
import { accountBanned } from "@/lib/admin/policy";
import { AdminDiscordBan } from "@/components/admin-user-actions";
import { AdminFrame } from "@/components/admin-frame";
import { AdminChip, roleLabel } from "@/components/admin-chip";
import { PanelHead } from "@/components/panel-head";
import { EmptyWell } from "@/components/empty-well";
import { SearchInput } from "@/components/field";
const filters = [
  ["all", "All accounts"],
  ["supporters", "Supporters"],
  ["review", "Needs review"],
  ["banned", "Banned"],
] as const;
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const data = await adminUsers(await adminPageActor(), {
    q: typeof raw.q === "string" ? raw.q : "",
    page: typeof raw.page === "string" ? raw.page : "1",
    filter: typeof raw.filter === "string" ? raw.filter : "all",
  });
  const url = (page: number, filter = data.query.filter) =>
    "/admin/users?" + new URLSearchParams({ q: data.query.q, filter, page: String(page) });
  const date = (d: Date | string) =>
    new Date(d).toLocaleDateString("en-GB", { timeZone: "UTC", dateStyle: "medium" });
  return (
    <AdminFrame
      title="Users & access"
      accent="access"
      description="Find an account, review its history and change access with a recorded reason."
      emblem="team-roles"
    >
      <section className="panel" aria-labelledby="admin-accounts">
        <PanelHead
          id="admin-accounts"
          title={
            <>
              Matching <em>accounts</em>
            </>
          }
          line={`${data.total.toLocaleString("en-GB")} found, 20 to a page.`}
          actions={<AdminDiscordBan />}
        />
        <form className="admin-search" method="get" role="search">
          <label htmlFor="admin-search" className="admin-search-field">
            <span className="sr-only">Search users</span>
            <SearchInput
              id="admin-search"
              className="well"
              name="q"
              defaultValue={data.query.q}
              maxLength={80}
              placeholder="Name, Discord ID or account ID"
            />
          </label>
          <input type="hidden" name="filter" value={data.query.filter} />
          <button className="button secondary">Search</button>
        </form>
        <nav className="segmented admin-seg" aria-label="User filters">
          {filters.map(([key, label]) => (
            <Link
              key={key}
              href={url(1, key)}
              aria-current={data.query.filter === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        {data.query.filter === "review" && (
          <p className="admin-note well">
            These accounts have open reports on their content. Reports are claims to check, not
            proof of abuse.
          </p>
        )}
        {data.rows.length ? (
          <div className="tool-table-scroll" tabIndex={0} role="region" aria-label="Accounts">
            <table className="tool-table admin-table admin-users-table">
              <caption className="sr-only">Outpost accounts</caption>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Access</th>
                  <th>Builds</th>
                  <th>Comps</th>
                  <th>Comments</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((u) => (
                  <tr key={u.id}>
                    <th scope="row">
                      <Link href={`/admin/users/${u.id}`} className="admin-user-name">
                        {u.name || "Unnamed account"}
                      </Link>
                      {u.accounts[0]?.providerAccountId ? (
                        <code>{u.accounts[0].providerAccountId}</code>
                      ) : (
                        <span className="admin-muted">No Discord link</span>
                      )}
                    </th>
                    <td className="admin-chips">
                      <AdminChip
                        tone={accountBanned(u) ? "danger" : isSupporter(u) ? "accent" : "default"}
                      >
                        {accountBanned(u) ? "Banned" : supporterLabel(u)}
                      </AdminChip>
                      {u.role !== "USER" && <AdminChip tone="warn">{roleLabel(u.role)}</AdminChip>}
                    </td>
                    <td data-unit={u._count.builds === 1 ? "build" : "builds"}>
                      {u._count.builds}
                    </td>
                    <td data-unit={u._count.compositions === 1 ? "comp" : "comps"}>
                      {u._count.compositions}
                    </td>
                    <td data-unit={u._count.comments === 1 ? "comment" : "comments"}>
                      {u._count.comments}
                    </td>
                    <td>{date(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyWell
            emblem="team-roles"
            title="No matching accounts"
            line="Try a name or the full numeric Discord ID."
            action={
              <Link href="/admin/users" className="pill-link">
                Clear search and filter
              </Link>
            }
          />
        )}
        {data.total > 20 && (
          <nav className="admin-pagination" aria-label="User pages">
            {data.query.page > 1 ? (
              <Link href={url(data.query.page - 1)} className="pill-link">
                Previous
              </Link>
            ) : (
              <span className="pill-link" aria-disabled="true">
                Previous
              </span>
            )}
            <span>Page {data.query.page}</span>
            {data.query.page * 20 < data.total ? (
              <Link href={url(data.query.page + 1)} className="pill-link">
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
