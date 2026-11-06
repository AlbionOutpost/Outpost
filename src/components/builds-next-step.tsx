import type { ReactNode } from "react";
import Link from "@/components/build-region-link";
import { ArrowRight, Plus } from "lucide-react";
import { PanelHead } from "./panel-head";

/**
 * The closing step of a Builds page: one framed card that hands the player to the editor,
 * with copy for the page it closes and one second way on.
 */
export function BuildsNextStep({
  title,
  line,
  secondary,
}: {
  /** Mixed case with one word in `<em>`. */
  title: ReactNode;
  line: string;
  secondary: { href: string; label: string };
}) {
  return (
    <section
      className="raised has-scene builds-next-step"
      data-scene="build"
      aria-label="Next step"
    >
      <PanelHead
        emblem="strip-builds"
        title={title}
        line={line}
        actions={
          <>
            <Link className="button primary" href="/builds/new">
              <Plus size={16} aria-hidden="true" />
              Create a build
            </Link>
            <Link className="button secondary" href={secondary.href}>
              {secondary.label} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </>
        }
      />
    </section>
  );
}
