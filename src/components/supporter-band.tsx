import "@/app/supporter-band.css";
import type { ReactNode } from "react";
import Image from "next/image";

/**
 * The Supporter band: the crown over the courtyard, cut to its silhouette, with a display
 * title (one word in `<em>`), one line and up to two actions. The landing's callout, the
 * Supporter page's hero and the Teams pages' closing band are all this component.
 */
export function SupporterBand({
  id,
  title,
  line,
  actions,
  as: Heading = "h2",
  className = "supporter-band-page",
  children,
}: {
  id: string;
  title: ReactNode;
  line: ReactNode;
  actions?: ReactNode;
  as?: "h1" | "h2";
  /** Classes for the outer section; the landing passes its own frame and spacing. */
  className?: string;
  /** A short note under the actions. */
  children?: ReactNode;
}) {
  return (
    <section className={`landing-cta-wrap ${className}`} aria-labelledby={id}>
      <div className="landing-cta">
        <div className="landing-cta-art" aria-hidden="true">
          <Image
            src="/scenes/supporter/crown-courtyard.webp"
            width={1374}
            height={1145}
            alt=""
            unoptimized
            priority={Heading === "h1"}
          />
        </div>
        <div className="landing-cta-content">
          <Heading id={id}>{title}</Heading>
          <p>{line}</p>
          {actions && <div className="landing-cta-actions">{actions}</div>}
          {children}
        </div>
      </div>
    </section>
  );
}
