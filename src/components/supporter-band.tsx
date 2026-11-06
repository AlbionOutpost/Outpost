import type { ReactNode } from "react";
import Image from "next/image";
import styles from "./supporter-band.module.css";

/**
 * The landing's Supporter band (the crown over the courtyard, cut to its silhouette), for the
 * pages about the plan: a display title with one ember word, one line and up to two actions.
 * Same markup and measurements as the landing's `.landing-cta`, which loads only on `/`.
 */
export function SupporterBand({
  id,
  title,
  line,
  actions,
  as: Heading = "h2",
  children,
}: {
  id: string;
  title: ReactNode;
  line: ReactNode;
  actions?: ReactNode;
  as?: "h1" | "h2";
  children?: ReactNode;
}) {
  return (
    <section className={styles.wrap} aria-labelledby={id}>
      <div className={`landing-cta ${styles.band}`}>
        <div className={styles.art} aria-hidden="true">
          <Image
            src="/scenes/supporter/crown-courtyard.webp"
            width={1374}
            height={1145}
            alt=""
            unoptimized
            priority={Heading === "h1"}
          />
        </div>
        <div className={styles.content}>
          <Heading id={id} className={styles.title}>
            {title}
          </Heading>
          <p className={styles.line}>{line}</p>
          {actions && <div className={styles.actions}>{actions}</div>}
          {children}
        </div>
      </div>
    </section>
  );
}
