import { EmptyWell } from "@/components/empty-well";

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

/** Every recorded change as a well: what was done, the reason given, who and to whom, and when. */
export function AdminAuditRows({
  rows,
}: {
  rows: {
    id: string;
    action: string;
    reason: string;
    actorId: string;
    targetId: string;
    createdAt: Date | string;
  }[];
}) {
  return rows.length ? (
    <ol className="admin-audit-list">
      {rows.map((row) => (
        <li key={row.id} className="well">
          <div className="admin-audit-head">
            <strong>{label(row.action)}</strong>
            <time dateTime={new Date(row.createdAt).toISOString()}>{when(row.createdAt)}</time>
          </div>
          <p>{row.reason}</p>
          <dl>
            <div>
              <dt>Actor</dt>
              <dd>
                <code>{row.actorId}</code>
              </dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>
                <code>{row.targetId}</code>
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ol>
  ) : (
    <EmptyWell
      emblem="team-calendar"
      title="No administrative changes yet"
      line="Supporter gifts, bans and session revocations appear here with who made them and why."
    />
  );
}
