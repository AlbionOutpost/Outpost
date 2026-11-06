import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "@/components/build-region-link";
import styles from "./comps.module.css";

/**
 * A comp in a list, as the landing's comp window: a title bar with its chips over an ember rule,
 * the roster, and a caption line with the way in. Cards in a row share one height; the roster
 * stays at the top, so short comps leave room below rather than stretched rows.
 */
export function CompWindow({
  title,
  href,
  chips,
  caption,
  children,
}: {
  title: string;
  href: string;
  chips?: ReactNode;
  caption: ReactNode;
  children: ReactNode;
}) {
  return (
    <article
      className={`raised has-scene ${styles.window}`}
      data-scene="composition"
      data-comp-window=""
    >
      <div className={styles.bar}>
        <h3 className={styles.windowTitle}>
          <Link href={href} title={title}>
            {title}
          </Link>
        </h3>
        {chips && <span className={`landing-chips ${styles.chips}`}>{chips}</span>}
      </div>
      <div className={styles.windowBody}>{children}</div>
      <Link href={href} className={styles.caption} tabIndex={-1} aria-hidden="true">
        <span>{caption}</span>
        <span className={styles.captionGo}>
          Open comp <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </Link>
    </article>
  );
}

/** Page links under a list of comps: previous, where you are, next. */
export function CompPages({
  page,
  pages,
  next,
  href,
  label,
}: {
  page: number;
  /** Total pages, when the list knows it. */
  pages?: number;
  next: boolean;
  href: (page: number) => string;
  label: string;
}) {
  if (page <= 1 && !next) return null;
  return (
    <nav className={styles.pages} aria-label={label}>
      {page > 1 ? (
        <Link className="pill-link is-small" href={href(page - 1)}>
          <ArrowLeft size={14} aria-hidden="true" /> Previous
        </Link>
      ) : (
        <span />
      )}
      <span>{pages ? `Page ${page} of ${pages}` : `Page ${page}`}</span>
      {next ? (
        <Link className="pill-link is-small" href={href(page + 1)}>
          Next <ArrowRight size={14} aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
