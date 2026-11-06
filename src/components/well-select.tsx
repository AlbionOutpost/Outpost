import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./well-select.module.css";

/**
 * A native `<select>` styled as a well with a drawn chevron. It keeps every native behaviour
 * (keyboard, phone pickers, forms); label it as any select, with `<label>` or `aria-label`.
 */
export function WellSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <span className={`${styles.wrap}${className ? ` ${className}` : ""}`}>
      <select {...props} />
      <ChevronDown className={styles.chevron} size={16} aria-hidden="true" />
    </span>
  );
}
