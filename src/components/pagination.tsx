import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "@/components/build-region-link";
import styles from "./pagination.module.css";

/**
 * Page links under a list: "Previous", "Page X of Y", "Next", centred. An end that cannot go
 * further stays in place, dimmed and inert. Pass `href` for server-rendered pages (links keep the
 * region) or `onPage` for a list that loads in place.
 */
export function Pagination({
  label,
  page,
  pages,
  next = pages != null && page < pages,
  href,
  onPage,
  busy = false,
}: {
  /** The nav's accessible name ("Item pages"). */
  label: string;
  page: number;
  /** Total pages, when the list knows it. */
  pages?: number;
  /** Whether there is a next page (defaults to page < pages). */
  next?: boolean;
  href?: (page: number) => string;
  onPage?: (page: number) => void;
  /** A page is loading: both ends wait. */
  busy?: boolean;
}) {
  if (page <= 1 && !next) return null;
  const end = (to: number, enabled: boolean, rel: "Previous" | "Next") => {
    const content =
      rel === "Previous" ? (
        <>
          <ArrowLeft size={14} aria-hidden="true" /> Previous
        </>
      ) : (
        <>
          Next <ArrowRight size={14} aria-hidden="true" />
        </>
      );
    const name = `${rel} page`;
    if (onPage)
      return (
        <button
          type="button"
          className="pill-link is-small"
          aria-label={name}
          disabled={!enabled || busy}
          onClick={() => onPage(to)}
        >
          {content}
        </button>
      );
    return enabled && href ? (
      <Link className="pill-link is-small" href={href(to)} aria-label={name}>
        {content}
      </Link>
    ) : (
      <span className="pill-link is-small" aria-disabled="true">
        {content}
      </span>
    );
  };
  return (
    <nav className={styles.pages} aria-label={label}>
      {end(page - 1, page > 1, "Previous")}
      <span className={styles.where}>
        {pages
          ? `Page ${page.toLocaleString("en-GB")} of ${pages.toLocaleString("en-GB")}`
          : `Page ${page.toLocaleString("en-GB")}`}
      </span>
      {end(page + 1, next, "Next")}
    </nav>
  );
}
