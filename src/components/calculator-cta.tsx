import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import Link from "@/components/build-region-link";
import s from "@/app/production-calculator.module.css";

/**
 * The closing band of a calculator page, as on /tools/crafting and the landing: a display title
 * with one ember word, one line, and a primary and a secondary link. Region follows the server.
 */
export function CalculatorCta({
  title,
  line,
  primary,
  secondary = { href: "/tools", label: "All tools" },
}: {
  /** e.g. `<>Hauling more than one <em>item</em>?</>` */
  title: ReactNode;
  line: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className={`raised has-scene ${s.cta}`} data-scene="city">
      <h2>{title}</h2>
      <p>{line}</p>
      <div className={s.ctaActions}>
        <Link className="button primary" href={primary.href}>
          {primary.label} <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link className="button secondary" href={secondary.href}>
          {secondary.label}
        </Link>
      </div>
    </section>
  );
}
