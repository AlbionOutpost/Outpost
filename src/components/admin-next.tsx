import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/link";
import { SectionHeading } from "./section-heading";

/** The closing row of an admin page: framed cards in the market pages' style, headline only. */
export function AdminNextSteps({
  id,
  title,
  line,
  cards,
}: {
  id: string;
  title: ReactNode;
  line: string;
  cards: { href: string; title: string; line: string }[];
}) {
  return (
    <section className="admin-next" aria-labelledby={id}>
      <SectionHeading id={id} title={title} line={line} />
      <ul>
        {cards.map((card) => (
          <li key={card.href}>
            <Link className="raised has-scene" data-scene="city" href={card.href}>
              <span className="admin-next-copy">
                <span className="admin-next-title">{card.title}</span>
                <span className="admin-next-line">{card.line}</span>
              </span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
