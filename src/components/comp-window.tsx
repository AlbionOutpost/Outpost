import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/build-region-link";
import "@/app/landing-window.css";
import windows from "./landing/windows.module.css";
import styles from "./comps.module.css";

/**
 * A comp in a list, as the landing's comp window (landing-window.css): a title bar with its
 * chips over an ember rule, the roster, and a foot row with the size, the author and the way in.
 * Rows stretch to the window's height on wide screens; phones show the first three members.
 */
export function CompWindow({
  title,
  href,
  chips,
  total,
  noun,
  byline,
  children,
}: {
  title: string;
  href: string;
  chips?: ReactNode;
  /** How many members the comp has. */
  total: number;
  noun: "member" | "player";
  byline: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`raised has-scene landing-window ${windows.window} ${styles.window}`}
      data-scene="composition"
      data-comp-window=""
    >
      <div className={`landing-window-bar ${windows.bar}`}>
        <Link href={href} className={`landing-window-title ${styles.windowTitle}`} title={title}>
          <h3>{title}</h3>
        </Link>
        {chips && <span className={`landing-chips ${styles.chips}`}>{chips}</span>}
      </div>
      <div className={`landing-window-body ${windows.body} ${styles.windowBody}`}>{children}</div>
      <Link
        href={href}
        className={`landing-window-foot ${windows.foot} ${styles.foot}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <span>
          <strong>
            {total} {total === 1 ? noun : `${noun}s`}
          </strong>
          <small>
            {byline}
            {total > 5 && <span className={styles.wideOnly}> · +{total - 5} more</span>}
            {total > 3 && <span className={styles.phoneOnly}> · +{total - 3} more</span>}
          </small>
        </span>
        <ArrowUpRight size={20} aria-hidden="true" />
      </Link>
    </article>
  );
}

/** The list comp windows sit in: three across, two on tablets, one on phones. */
export function CompGrid({ children }: { children: ReactNode }) {
  return <ul className={`${windows.windows} ${styles.grid}`}>{children}</ul>;
}
