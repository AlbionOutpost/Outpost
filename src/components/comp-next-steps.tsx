import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/build-region-link";
import { SectionHeading } from "./section-heading";
import styles from "./market-next-steps.module.css";

const steps = {
  library: {
    href: "/compositions?source=library",
    emblem: "strip-comps",
    title: "Group Builds",
    line: "Comps other players recorded, with every member’s loadout.",
  },
  player: {
    href: "/compositions?source=player",
    emblem: "team-roles",
    title: "Player comps",
    line: "Rosters players have shared, with names in the slots.",
  },
  create: {
    href: "/compositions/new",
    emblem: "team-comps",
    title: "Plan a comp",
    line: "Set the party size, give each slot a role and a loadout, share it.",
  },
  builds: {
    href: "/builds?source=library",
    emblem: "strip-builds",
    title: "Build library",
    line: "Find the loadout a slot is missing, then assign it in the planner.",
  },
  teams: {
    href: "/groups",
    emblem: "team-announce",
    title: "Teams",
    line: "Share comps with your guild and post the mass-up.",
  },
} as const;

/** The closing row of the comp pages: where the player goes next, as framed cards. */
export function CompNextSteps({
  show,
  title,
  line,
}: {
  show: (keyof typeof steps)[];
  /** One word in <em>. */
  title: ReactNode;
  line: string;
}) {
  return (
    <section className={styles.section} aria-labelledby="comp-next-steps">
      <SectionHeading id="comp-next-steps" title={title} line={line} />
      <ul className={styles.grid}>
        {show.map((key) => {
          const step = steps[key];
          return (
            <li key={key}>
              <Link
                className={`raised has-scene ${styles.card}`}
                data-scene="composition"
                href={step.href}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                <img src={`/albion/icons/${step.emblem}.webp`} alt="" width={48} height={48} />
                <span className={styles.copy}>
                  <span className={styles.title}>{step.title}</span>
                  <span className={styles.line}>{step.line}</span>
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
