import type { ReactNode } from "react";
import Link from "@/components/build-region-link";

export type MastheadTab = {
  href: string;
  label: string;
  icon?: ReactNode;
  /** The tab for the page itself. */
  current?: boolean;
  /** In-page anchor rather than a route. */
  anchor?: boolean;
};

/** A row of pill tabs under a masthead title: the page's sections and its sibling tools. Links keep the region. */
export function MastheadTabs({ label, tabs }: { label: string; tabs: MastheadTab[] }) {
  return (
    <nav className="masthead-tabs" aria-label={label}>
      {tabs.map((t) =>
        t.anchor ? (
          <a key={t.href} href={t.href}>
            {t.icon}
            {t.label}
          </a>
        ) : (
          <Link key={t.href} href={t.href} aria-current={t.current ? "page" : undefined}>
            {t.icon}
            {t.label}
          </Link>
        ),
      )}
    </nav>
  );
}
