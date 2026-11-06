import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import Link from "@/components/build-region-link";

/**
 * A page section's heading, as on the landing: a mixed-case display title with one word in
 * the accent (wrap it in `<em>`), one muted line, and an optional "View all" pill link on the
 * right (under the line on phones). Styles: `.section-heading` in product-system.css.
 */
export function SectionHeading({
  id,
  title,
  line,
  link,
}: {
  /** The h2's id, for the section's aria-labelledby. */
  id?: string;
  /** e.g. `<>Your <em>builds</em></>` */
  title: ReactNode;
  line?: ReactNode;
  link?: { href: string; label: string };
}) {
  return (
    <div className="section-heading">
      <h2 id={id}>{title}</h2>
      {line && <p>{line}</p>}
      {link && (
        <Link className="pill-link" href={link.href}>
          {link.label} <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
