"use client";
import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./disclosure.module.css";

/**
 * Secondary detail that most players skip ("How this is calculated", "Your assumptions",
 * coverage notes): a well with a full-width toggle that opens by height, with the chevron
 * turning. Use it in place of a bare `<details>` with a ▸ triangle. Not for primary content.
 */
export function Disclosure({
  summary,
  meta,
  defaultOpen = false,
  children,
}: {
  summary: ReactNode;
  /** A short muted note beside the summary, e.g. a count. */
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={styles.disclosure}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.summary}>{summary}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
        <ChevronDown className={styles.chevron} size={18} aria-hidden="true" />
      </button>
      <div id={id} className={styles.panel} data-open={open ? "" : undefined}>
        <div className={styles.body}>
          <div className={styles.inner}>{children}</div>
        </div>
      </div>
    </div>
  );
}
