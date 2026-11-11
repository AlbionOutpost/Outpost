import { ArrowRight } from "lucide-react";
import Link from "@/components/link";
import { toolExplainers } from "@/lib/tool-explainers";
import styles from "./how-it-works.module.css";

/**
 * A calculator's "How it works" block: what it works out, what you enter and the key formula in
 * words, with the guide that explains the mechanic. Server-rendered below the tool, as a sibling
 * of the calculator's `.page` so the tool itself still fits the first screen and the explanation
 * is in the page's first HTML. Copy lives in `src/lib/tool-explainers.ts`.
 */
export function HowItWorks({ path }: { path: keyof typeof toolExplainers }) {
  const explainer = toolExplainers[path];
  const id = `how-it-works-${path.split("/").pop()}`;
  return (
    <section className={styles.how} aria-labelledby={id} data-how-it-works="">
      <div className={styles.head}>
        <div className={styles.lead}>
          <h2 id={id}>How it works</h2>
          <p>{explainer.computes}</p>
        </div>
        {explainer.guide && (
          <Link className="pill-link" href={`/guides/${explainer.guide.slug}`}>
            {explainer.guide.title} guide <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className={styles.columns}>
        <div>
          <h3>What you enter</h3>
          <p>{explainer.inputs}</p>
        </div>
        <div>
          <h3>The math</h3>
          {explainer.math.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
