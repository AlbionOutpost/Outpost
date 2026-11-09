import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/build-region-link";
import { SectionHeading } from "./section-heading";
import styles from "./market-next-steps.module.css";

export type NextStepCard = {
  href: string;
  /** File name under /albion/icons (a painted emblem). */
  emblem: string;
  title: string;
  line: string;
  scene?: "market" | "economy" | "build" | "composition" | "city";
};

/**
 * A page's closing row, in the same tool cards as the market pages' `MarketNextSteps`:
 * a section heading with one ember word and up to three places to go next.
 */
export function NextStepCards({
  id,
  title,
  line,
  link,
  cards,
}: {
  id: string;
  title: ReactNode;
  line: string;
  link?: { href: string; label: string };
  cards: NextStepCard[];
}) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <SectionHeading id={id} title={title} line={line} link={link} />
      <ul className={styles.grid}>
        {cards.map((card) => (
          <li key={card.href}>
            <Link
              className={`raised ${styles.card}`}
              data-scene={card.scene ?? "city"}
              href={card.href}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
              <img src={`/albion/icons/${card.emblem}.webp`} alt="" width={48} height={48} />
              <span className={styles.copy}>
                <span className={styles.title}>{card.title}</span>
                <span className={styles.line}>{card.line}</span>
              </span>
              <ArrowUpRight className={styles.arrow} size={18} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
