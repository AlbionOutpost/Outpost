"use client";

import type { MouseEvent } from "react";
import type { LegalLocale } from "@/lib/legal-language";
import styles from "./legal.module.css";

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
