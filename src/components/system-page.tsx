import type { ReactNode } from "react";

/**
 * Full-page states players can land on (not found, something broke): the landing hero's
 * language on the site backdrop, centred over a soft shade, with a painted emblem, a short
 * eyebrow, a display title and at most two named actions. Styles: `.system-page` in
 * product-system.css.
 */
export function SystemPage({
  eyebrow,
  title,
  line,
  emblem = "tool-market",
  actions,
}: {
  eyebrow: string;
  /** Put one word in `<em>` for the accent, as on the landing. */
  title: ReactNode;
  line: ReactNode;
  /** File name under /albion/icons. */
  emblem?: string;
  actions: ReactNode;
}) {
  return (
    <section className="system-page" aria-labelledby="system-page-title">
      <div className="system-page-copy">
        {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
        <img
          className="system-page-emblem"
          src={`/albion/icons/${emblem}.webp`}
          alt=""
          width={72}
          height={72}
          // Every page carries the not-found tree; lazy keeps its emblem from being preloaded
          loading="lazy"
        />
        <p className="system-page-eyebrow">{eyebrow}</p>
        <h1 id="system-page-title">{title}</h1>
        <p className="system-page-line">{line}</p>
        <div className="system-page-actions">{actions}</div>
      </div>
    </section>
  );
}
