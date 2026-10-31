import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import Link from "@/components/link";
import { ToolIcon } from "@/components/tool-icon";

type Glyph = Parameters<typeof ToolIcon>[0]["name"];

/**
 * Frame shared by the landing-page tool cards: the painted emblem, title and one line on
 * top; the real software in the middle; one outlined action at the bottom.
 */
export function PreviewShell({
  id,
  emblem,
  glyph,
  title,
  description,
  href,
  action,
  scene,
  children,
}: {
  id: string;
  /** File name under /albion/icons, the owner's painted emblem for this tool. */
  emblem: string;
  /** Line glyph for the action button. */
  glyph: Glyph;
  title: string;
  description: string;
  href: string;
  action: string;
  scene: "market" | "build" | "city";
  children: ReactNode;
}) {
  return (
    <article className="raised has-scene landing-card" data-scene={scene} aria-labelledby={id}>
      <div className="landing-card-head">
        {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
        <img
          className="landing-card-emblem"
          src={`/albion/icons/${emblem}.webp`}
          alt=""
          width={56}
          height={56}
        />
        <div>
          <h3 id={id}>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="landing-card-body">{children}</div>
      <Link href={href} className="landing-card-action">
        <ToolIcon name={glyph} size={18} />
        {action} <ArrowRight size={16} />
      </Link>
    </article>
  );
}

export function PreviewStatus({ children }: { children: ReactNode }) {
  return (
    <p className="landing-preview-status" role="status">
      {children}
    </p>
  );
}
