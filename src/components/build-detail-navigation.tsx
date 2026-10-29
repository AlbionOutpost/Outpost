"use client";
import { useSyncExternalStore } from "react";

const sections = [
  ["build-overview", "Overview"],
  ["build-equipment", "Equipment"],
  ["build-abilities", "Abilities"],
  ["build-alternatives", "Alternatives"],
  ["build-stats", "Stats & calculations"],
  ["build-discussion", "Comments"],
] as const;

function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("popstate", listener);
  };
}

function currentSection() {
  let hash: string;
  try {
    hash = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return "build-overview";
  }
  if (sections.some(([id]) => id === hash)) return hash;
  if (hash.startsWith("build-gear-")) return "build-equipment";
  if (hash.startsWith("build-alternatives-")) return "build-alternatives";
  if (hash === "build-cost") return "build-stats";
  return "build-overview";
}

const serverSection = () => "build-overview";

export function BuildDetailNavigation() {
  const current = useSyncExternalStore(subscribe, currentSection, serverSection);
  return (
    <nav className="detail-section-navigation" aria-label="Build sections">
      {sections.map(([id, name]) => (
        <a key={id} href={`#${id}`} aria-current={current === id ? "location" : undefined}>
          {name}
        </a>
      ))}
    </nav>
  );
}
