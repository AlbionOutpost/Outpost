import type { ReactNode, CSSProperties } from "react";

/** A bounded acknowledgement of a confirmed action. Sequence zero never animates
 * persisted state on load; each successful action gets a fresh, interruptible mark. */
export function ReactionFeedback({
  children,
  sequence,
  active,
  className = "",
}: {
  children: ReactNode;
  sequence: number;
  active: boolean;
  className?: string;
}) {
  return (
    <span className={`reaction-feedback-host ${className}`} aria-hidden="true">
      <span
        key={sequence}
        className="reaction-feedback-mark"
        data-feedback={sequence ? (active ? "added" : "removed") : undefined}
      >
        {children}
        {sequence > 0 && active && (
          <span className="reaction-feedback-particles">
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} style={{ "--particle": i } as CSSProperties} />
            ))}
          </span>
        )}
      </span>
    </span>
  );
}
