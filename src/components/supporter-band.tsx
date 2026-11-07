import "@/app/supporter-band.css";
import type { ReactNode } from "react";
import { variantSrcSet } from "@/lib/image-variants";

const art = "/scenes/supporter/crown-courtyard.webp";

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
          {/* At most 1040px wide, inside the page gutters. As a page's hero (h1) it is above the
              fold and loads first; elsewhere it waits for the scroll. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static painting with its own srcset */}
          <img
            src={art}
            srcSet={variantSrcSet(art)}
            sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1104px) calc(100vw - 64px), 1040px"
            width={1374}
            height={1145}
            alt=""
            loading={Heading === "h1" ? "eager" : "lazy"}
            fetchPriority={Heading === "h1" ? "high" : undefined}
            decoding="async"
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
