import type { ReactNode } from "react";
import { CircleCheck, ListChecks } from "lucide-react";
import "./economy-workspaces.css";

/** Presentation only: callers provide prerequisites from their existing calculation model. */
export function CalculationReadiness({
  title,
  children,
  missing,
  action,
}: {
  title: string;
  children?: ReactNode;
  missing: string[];
  action?: ReactNode;
}) {
  return (
    <div className="calculation-readiness" data-ready={missing.length === 0} role="status">
      {missing.length ? (
        <ListChecks size={20} aria-hidden="true" />
      ) : (
        <CircleCheck size={20} aria-hidden="true" />
      )}
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
        {!!missing.length && (
          <ul>
            {missing.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        )}
      </div>
      {action && <div className="calculation-readiness-action">{action}</div>}
    </div>
  );
}
