"use client";

import { useEffect, type MouseEvent } from "react";
import type { LegalLocale } from "@/lib/legal-language";
import styles from "./legal.module.css";

// Mount after the document: native fragment navigation can run while streamed sections
// are still hidden. Align again after hydration and font layout have both completed.
export function LegalSectionRestore() {
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    const reveal = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (cancelled) return;
          let id: string;
          try {
            id = decodeURIComponent(window.location.hash.slice(1));
          } catch {
            return;
          }
          const target = document.getElementById(id);
          if (target?.matches("article :is(section,h2,h3)[id]"))
            target.scrollIntoView({ block: "start", behavior: "instant" });
        });
      });
    };
    void document.fonts.ready.then(() => {
      if (!cancelled) reveal();
    });
    window.addEventListener("hashchange", reveal);
    window.addEventListener("popstate", reveal);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", reveal);
      window.removeEventListener("popstate", reveal);
    };
  }, []);
  return null;
}

export function LegalLanguageSwitch({ locale, region }: { locale: LegalLocale; region?: string }) {
  const href = (language: LegalLocale) => {
    const query = new URLSearchParams({ lang: language });
    if (region) query.set("region", region);
    return `/legal?${query}`;
  };
  // Fragments are browser-only. Keep the current section when following either native link.
  const keepSection = (event: MouseEvent<HTMLAnchorElement>) => {
    event.currentTarget.href = `${href(event.currentTarget.lang as LegalLocale)}${window.location.hash}`;
  };
  return (
    <nav className={styles.languageSwitch} aria-label={locale === "de" ? "Sprache" : "Language"}>
      {(
        [
          ["en", "English"],
          ["de", "Deutsch"],
        ] as const
      ).map(([language, label]) => (
        <a
          key={language}
          href={href(language)}
          hrefLang={language}
          lang={language}
          aria-current={locale === language ? "true" : undefined}
          onClick={keepSection}
          onAuxClick={keepSection}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
