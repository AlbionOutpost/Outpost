import { ArrowUpRight } from "lucide-react";
import Link from "@/components/build-region-link";
import { SectionHeading } from "./section-heading";
import styles from "./market-next-steps.module.css";

const tools = {
  market: {
    href: "/tools/market",
    emblem: "tool-market",
    title: "Market Explorer",
    line: "Prices in every city, so you know where to buy and where to dump.",
  },
  flipping: {
    href: "/tools/flipping",
    emblem: "tool-market",
    title: "Market flipping",
    line: "Buy in one city, sell in another, and see what you keep.",
  },
  crafting: {
    href: "/tools/crafting",
    emblem: "tool-craft",
    title: "Crafting calculator",
    line: "See if a craft makes silver before you burn the mats.",
  },
  planner: {
    href: "/shopping-list",
    emblem: "tool-planner",
    title: "Crafting Planner",
    line: "List what you want to craft, tick off what you have, buy the rest.",
  },
} as const;

/**
 * The closing row of the market pages: three framed tool cards that take the price the player
 * just checked somewhere useful. Region follows the player's server.
 */
export function MarketNextSteps({
  show,
  title = (
    <>
      Put the price to <em>work</em>
    </>
  ),
  line = "Take what you just checked into a trade or a craft.",
}: {
  show: (keyof typeof tools)[];
  /** The section heading, with one word in <em>; each page says what fits it. */
  title?: React.ReactNode;
  line?: string;
}) {
  return (
    <section className={styles.section} aria-labelledby="market-next-steps">
      <SectionHeading
        id="market-next-steps"
        title={title}
        line={line}
        link={{ href: "/tools", label: "All tools" }}
      />
      <ul className={styles.grid}>
        {show.map((key) => {
          const tool = tools[key];
          return (
            <li key={key}>
              <Link
                className={`raised has-scene ${styles.card}`}
                data-scene="market"
                href={tool.href}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                <img
                  src={`/albion/icons/${tool.emblem}.webp`}
                  alt=""
                  width={48}
                  height={48}
                  loading="lazy"
                />
                <span className={styles.copy}>
                  <span className={styles.title}>{tool.title}</span>
                  <span className={styles.line}>{tool.line}</span>
                </span>
                <ArrowUpRight className={styles.arrow} size={18} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
