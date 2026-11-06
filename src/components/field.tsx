import type { ComponentProps, ReactNode } from "react";
import { Search } from "lucide-react";
import styles from "./field.module.css";

/**
 * One labelled form control: the 12px muted label above, the control, then an optional hint and
 * the field's error, each said once under it. The control itself is styled by the shared field
 * rules in product-system.css, so any input, `WellSelect` or textarea can go inside.
 */
export function Field({
  label,
  hint,
  error,
  wide,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`${styles.field}${className ? ` ${className}` : ""}`}
      data-wide={wide ? "" : undefined}
    >
      <label>
        <span>{label}</span>
        {children}
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** A text field with the search glyph inside its leading edge. Label it as any input. */
export function SearchInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <span className={`${styles.search}${className ? ` ${className}` : ""}`}>
      <Search size={16} aria-hidden="true" />
      <input {...props} />
    </span>
  );
}
