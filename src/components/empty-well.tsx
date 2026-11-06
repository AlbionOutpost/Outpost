import type { ReactNode } from "react";
import styles from "./empty-well.module.css";

/**
 * The empty state of a list, board or panel: a dashed well that says what is missing in one
 * line and offers the one next action. Render it in place of the content, inside the same panel;
 * hide controls that cannot act until there is something to act on.
 */
export function EmptyWell({
  title,
  line,
  emblem,
  action,
}: {
  /** What is empty, as a statement: "No timers yet". */
  title: string;
  line?: ReactNode;
  /** File name under /albion/icons (a painted emblem). */
  emblem?: string;
  /** One link or button, usually `.button.secondary` or `.pill-link`. */
  action?: ReactNode;
}) {
  return (
    <div className={styles.well}>
      {emblem && (
        // eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem
        <img
          className={styles.emblem}
          src={`/albion/icons/${emblem}.webp`}
          alt=""
          width={48}
          height={48}
        />
      )}
      <div className={styles.copy}>
        <p className={styles.title}>{title}</p>
        {line && <p className={styles.line}>{line}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
