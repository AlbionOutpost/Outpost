"use client";
import { useEffect, useRef, type ReactNode } from "react";
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

/** A row of pill tabs under a masthead title: the page's sections and its sibling tools. Links keep the region.
 * On phones the row scrolls sideways; the current tab is scrolled into view so it is never hidden. */
export function MastheadTabs({ label, tabs }: { label: string; tabs: MastheadTab[] }) {
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const row = nav.current;
    const tab = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !tab) return;
    // Bring the tab's end clear of the edge fade, keeping as many earlier tabs in view as possible
    const end = tab.getBoundingClientRect().right - row.getBoundingClientRect().left;
    if (end > row.clientWidth - 56) row.scrollLeft += end - (row.clientWidth - 56);
  }, []);
  return (
    <nav ref={nav} className="masthead-tabs" aria-label={label}>
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
