import { ArrowRight } from "lucide-react";
import { EmptyWell } from "@/components/empty-well";

type Row = {
  id: string;
  action: string;
  reason: string;
  actorId: string;
  targetId: string;
  createdAt: Date | string;
};
const label = (action: string) => {
  const text = action.replaceAll("-", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const when = (value: Date | string) =>
  new Date(value).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";

/**
 * Recorded admin changes. `table` is the full record (Action, Reason, Actor, Target, When);
 * `compact` is one wrapped line per change for the overview and an account's history.
 */
export function AdminAuditRows({
  rows,
  variant = "compact",
}: {
  rows: Row[];
  variant?: "table" | "compact";
}) {
  if (!rows.length)
    return (
      <EmptyWell
        emblem="team-calendar"
        title="No administrative changes yet"
        line="Supporter gifts, bans and session revocations appear here with who made them and why."
      />
    );
  if (variant === "table")
    return (
      <div className="tool-table-scroll" tabIndex={0} role="region" aria-label="Recorded changes">
        <table className="tool-table admin-table admin-audit-table">
          <caption className="sr-only">Administrative changes, newest first</caption>
          <thead>
            <tr>
              <th>Action</th>
              <th>Reason</th>
              <th>Actor</th>
              <th>Target</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <th scope="row">{label(row.action)}</th>
                <td>{row.reason}</td>
                <td>
                  <code>{row.actorId}</code>
                </td>
                <td>
                  <code>{row.targetId}</code>
                </td>
                <td>
                  <time dateTime={new Date(row.createdAt).toISOString()}>
                    {when(row.createdAt)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <ol className="admin-audit-list">
      {rows.map((row) => (
        <li key={row.id}>
          <strong>{label(row.action)}</strong>
          <span className="admin-audit-reason">{row.reason}</span>
          <span className="admin-audit-ids">
            <span className="sr-only">Actor </span>
            <code>{row.actorId}</code>
            <ArrowRight size={12} aria-hidden="true" />
            <span className="sr-only">Target </span>
            <code>{row.targetId}</code>
          </span>
          <time dateTime={new Date(row.createdAt).toISOString()}>{when(row.createdAt)}</time>
        </li>
      ))}
    </ol>
  );
}
