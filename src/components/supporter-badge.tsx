import { Gem } from "lucide-react";
import styles from "./supporter-badge.module.css";

/**
 * The public Supporter badge beside a name. Pass the server-derived `supporter` flag
 * (`publicSupporter` in src/lib/billing/plan.ts); never a client claim. `compact` shows the gem
 * alone, for dense cards and bylines, and still names the badge for screen readers.
 */
export function SupporterBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={styles.badge}
      data-compact={compact ? "" : undefined}
      title="Supporter: helps keep Outpost running"
    >
      <Gem size={12} strokeWidth={2.4} aria-hidden="true" />
      <span className={compact ? "sr-only" : undefined}>Supporter</span>
    </span>
  );
}
