import type { ReactNode } from "react";
import Link from "@/components/link";
import { ToolIcon } from "@/components/tool-icon";
import { ArrowRight } from "lucide-react";

type Glyph = Parameters<typeof ToolIcon>[0]["name"];

/**
 * Frame shared by the landing-page product cards: emblem, title, one line and a "live data"
 * tag on top; the real software in the middle; one full-width action at the bottom.
 */
export function PreviewShell({
  id,
  glyph,
  title,
  description,
  href,
  action,
  tag = "Live data",
  className = "",
  children,
}: {
  id: string;
  glyph: Glyph;
  title: string;
  description: string;
  href: string;
  action: string;
  tag?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article className={`landing-card${className ? ` ${className}` : ""}`} aria-labelledby={id}>
      <div className="landing-card-head">
        <span className="landing-card-emblem" aria-hidden="true">
          <ToolIcon name={glyph} size={22} />
        </span>
        <div>
          <h3 id={id}>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="landing-card-tag">
          <span className="landing-card-tag-dot" aria-hidden="true" />
          {tag}
        </span>
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
