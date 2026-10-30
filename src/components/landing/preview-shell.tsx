import type { ReactNode } from "react";
import Link from "@/components/link";
import { ArrowRight } from "lucide-react";

/**
 * Frame shared by the landing-page product previews: a titled window with the live software
 * inside and one action below. Each preview owns its internal composition.
 */
export function PreviewShell({
  id,
  eyebrow,
  title,
  description,
  href,
  action,
  tone = "default",
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  action: string;
  tone?: "default" | "lead";
  children: ReactNode;
}) {
  return (
    <article className={`landing-preview${tone === "lead" ? " is-lead" : ""}`} aria-labelledby={id}>
      <div className="landing-preview-heading">
        <p className="landing-kicker">{eyebrow}</p>
        <h3 id={id}>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="landing-preview-window">{children}</div>
      <Link
        href={href}
        className={`button ${tone === "lead" ? "primary" : "secondary"} landing-preview-action`}
      >
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
