import Link from "@/components/build-region-link";
import { ArrowRight, Plus } from "lucide-react";
import { PanelHead } from "./panel-head";

/** The closing step of a Builds page: one framed card that hands the player to the editor. */
export function BuildsNextStep() {
  return (
    <section
      className="raised has-scene builds-next-step"
      data-scene="build"
      aria-label="Next step"
    >
      <PanelHead
        emblem="strip-builds"
        title={
          <>
            Post <em>your</em> build
          </>
        }
        line="Lay out your loadout, pick its abilities and swaps, then share the link with your Team."
        actions={
          <>
            <Link className="button primary" href="/builds/new">
              <Plus size={16} aria-hidden="true" />
              Create a build
            </Link>
            <Link className="button secondary" href="/compositions">
              Plan a comp <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </>
        }
      />
    </section>
  );
}
