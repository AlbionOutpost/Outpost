import type { ReactNode } from "react";
import styles from "./panel-head.module.css";

/**
 * The head of a working panel (`.panel`): an optional painted emblem or numbered step, a
 * Barlow title, one muted line and actions on the right. One per panel; titles are h2 unless
 * the panel sits under a section heading (`as="h3"`).
 */
export function PanelHead({
  id,
  title,
  line,
  emblem,
  step,
  actions,
  as: Heading = "h2",
}: {
  id?: string;
  title: ReactNode;
  line?: ReactNode;
  /** File name under /albion/icons (a painted emblem). */
  emblem?: string;
  /** Step number for calculators' configure → materials → results panels. */
  step?: number;
  actions?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className={styles.head}>
      {step !== undefined ? (
        <span className={styles.step} aria-hidden="true">
          {step}
        </span>
      ) : (
        emblem && (
          // eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem
          <img
            className={styles.emblem}
            src={`/albion/icons/${emblem}.webp`}
            alt=""
            width={44}
            height={44}
          />
        )
      )}
      <div className={styles.copy}>
        <Heading id={id} className={styles.title}>
          {step !== undefined && <span className="sr-only">Step {step}: </span>}
          {title}
        </Heading>
        {line && <p className={styles.line}>{line}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
