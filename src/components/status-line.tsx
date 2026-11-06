import type { ReactNode } from "react";
import styles from "./status-line.module.css";

/**
 * Loading, empty, partial, stale or failed, said once, in one line, inside the element that is
 * affected ("Loading quotes…", "No listings for this item right now."). Announced politely.
 * Keep the element's structure (table head, chart axis) around it.
 */
export function StatusLine({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "stale" | "error";
}) {
  return (
    <p className={styles.status} data-tone={tone} role="status">
      {children}
    </p>
  );
}

/** A value we do not have (see DATA.md): an em dash and "Unavailable", never 0 or blank. */
export function Unavailable({ label = "Unavailable" }: { label?: string }) {
  return (
    <span className={styles.unavailable}>
      <span aria-hidden="true">—</span>
      <span>{label}</span>
    </span>
  );
}
