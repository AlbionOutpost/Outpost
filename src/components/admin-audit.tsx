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
        <li key={row.id}>
          <div>
            <strong>{row.action.replaceAll("-", " ")}</strong>
            <time dateTime={new Date(row.createdAt).toISOString()}>
              {new Date(row.createdAt).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "UTC",
              })}{" "}
              UTC
            </time>
          </div>
          <p>{row.reason}</p>
          <small>
            Actor <code>{row.actorId}</code> · Target <code>{row.targetId}</code>
          </small>
        </li>
      ))}
    </ol>
  ) : (
    <div className="admin-empty">
      <h3>No administrative changes yet</h3>
      <p>
        Premium grants, bans and session revocations will appear here with their actor and reason.
      </p>
    </div>
  );
}
