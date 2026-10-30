import type { ReactNode } from "react";
import Link from "@/components/link";
import { ArrowRight } from "lucide-react";

/**
 * Frame shared by the landing-page product windows: a short title row, the live software
 * inside, and a footer bar that carries the source note and the one action.
 */
export function PreviewShell({
  id,
  eyebrow,
  title,
  href,
  action,
  note,
  tone = "default",
  className = "",
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  href: string;
  action: string;
  note?: ReactNode;
  tone?: "default" | "lead";
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={`landing-preview${tone === "lead" ? " is-lead" : ""}${className ? ` ${className}` : ""}`}
      aria-labelledby={id}
    >
      <div className="landing-preview-heading">
        <p className="landing-kicker">{eyebrow}</p>
        <h3 id={id}>{title}</h3>
      </div>
      <div className="landing-preview-window">
        <div className="landing-preview-body">{children}</div>
        <div className="landing-preview-footer">
          {note ? <span className="landing-preview-note">{note}</span> : <span />}
          <Link
            href={href}
            className={`button ${tone === "lead" ? "primary" : "secondary"} landing-preview-action`}
          >
            {action} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
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
