import Link from "@/components/link";
import { Search, ArrowUpRight } from "lucide-react";
import { adminPageActor } from "@/lib/admin/page-access";
import { adminUsers } from "@/lib/admin/queries";
import { isSupporter } from "@/lib/billing/plan";
import { accountBanned } from "@/lib/admin/policy";
import { AdminDiscordBan } from "@/components/admin-user-actions";
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
  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Users & access</h1>
          <p>Find an account, review its history and manage access deliberately.</p>
        </div>
        <AdminDiscordBan />
      </header>
      <section className="admin-surface">
        <form className="admin-search" method="get">
          <label htmlFor="admin-search">
            <Search size={18} />
            <span className="sr-only">Search users</span>
          </label>
          <input
            id="admin-search"
            name="q"
            defaultValue={data.query.q}
            maxLength={80}
            placeholder="Name, Discord ID or account ID"
          />
          <input type="hidden" name="filter" value={data.query.filter} />
          <button className="button secondary">Search</button>
        </form>
        <nav className="admin-tabs" aria-label="User filters">
          {[
            ["all", "All accounts"],
            ["supporters", "Supporters"],
            ["review", "Needs review"],
            ["banned", "Banned"],
          ].map(([key, label]) => (
            <Link
              key={key}
              href={url(1, key as typeof data.query.filter)}
              aria-current={data.query.filter === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-section-head">
          <p>{data.total.toLocaleString()} matching accounts</p>
          <p>20 per page</p>
        </div>
        {data.query.filter === "review" && (
          <p className="admin-notice">
            These accounts have open reports on their content. Reports are allegations to review,
            not proof of abuse.
          </p>
        )}
        <div className="admin-table-scroll">
          <table className="admin-users-table">
            <caption className="sr-only">Outpost accounts</caption>
            <thead>
              <tr>
                <th>Account</th>
                <th>Access</th>
                <th>Content</th>
                <th>Joined</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((u) => (
                <tr key={u.id}>
                  <th scope="row">
                    <Link href={`/admin/users/${u.id}`} className="admin-user-name">
                      {u.name || "Unnamed account"}
                    </Link>
                    <code>{u.accounts[0]?.providerAccountId || "No Discord link"}</code>
                  </th>
                  <td>
                    <span
                      className={`admin-status ${accountBanned(u) ? "is-danger" : isSupporter(u) ? "is-supporter" : ""}`}
                    >
                      {accountBanned(u) ? "Banned" : isSupporter(u) ? "Supporter" : "Free"}
                    </span>
                    {u.role !== "USER" && <small>{u.role.toLowerCase()}</small>}
                  </td>
                  <td>
                    {u._count.builds} builds · {u._count.compositions} comps
                    <small>{u._count.comments} comments</small>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}</td>
                  <td>
                    <Link
                      href={`/admin/users/${u.id}`}
                      aria-label={`Manage ${u.name || "account"}`}
                      className="admin-open"
                    >
                      <ArrowUpRight size={19} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.rows.length && (
          <div className="admin-empty">
            <h2>No matching accounts</h2>
            <p>Try a name or the full numeric Discord ID.</p>
          </div>
        )}
        <nav className="admin-pagination" aria-label="User pages">
          {data.query.page > 1 ? (
            <Link href={url(data.query.page - 1)}>Previous</Link>
          ) : (
            <span>Previous</span>
          )}
          <span>Page {data.query.page}</span>
          {data.query.page * 20 < data.total ? (
            <Link href={url(data.query.page + 1)}>Next</Link>
          ) : (
            <span>Next</span>
          )}
        </nav>
      </section>
    </>
  );
}
