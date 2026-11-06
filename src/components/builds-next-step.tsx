import type { ReactNode } from "react";
import Link from "@/components/build-region-link";
import { ArrowRight, Plus } from "lucide-react";

/**
 * The closing band of a Builds page, as the landing ends on its call band: one framed card,
 * a centred display heading with one ember word, one line and two named actions.
 */
export function BuildsNextStep({
  title,
  line,
  secondary,
  primary = { href: "/builds/new", label: "Create a build" },
}: {
  /** Mixed case with one word in `<em>`. */
  title: ReactNode;
  line: string;
  secondary: { href: string; label: string };
  primary?: { href: string; label: string };
}) {
  return (
    <section
      className="raised has-scene builds-next-step"
      data-scene="build"
      aria-labelledby="builds-next-step"
    >
      <h2 id="builds-next-step">{title}</h2>
      <p>{line}</p>
      <div className="builds-next-step-actions">
        <Link className="button primary" href={primary.href}>
          <Plus size={16} aria-hidden="true" />
          {primary.label}
        </Link>
        <Link className="button secondary" href={secondary.href}>
          {secondary.label} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
