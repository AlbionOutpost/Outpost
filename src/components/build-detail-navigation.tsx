"use client";
import { useEffect, useSyncExternalStore } from "react";

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

function revealCurrentSection() {
  let id: string;
  try {
    id = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  if (!target) return;
  let node: HTMLElement | null = target;
  while (node) {
    if (node instanceof HTMLDetailsElement) node.open = true;
    node = node.parentElement;
  }
  // A slot hash also updates React selection; its panel may still be hidden until commit.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
    }),
  );
}

export function BuildDetailNavigation() {
  const current = useSyncExternalStore(subscribe, currentSection, serverSection);
  useEffect(() => {
    const frame = requestAnimationFrame(revealCurrentSection);
    window.addEventListener("hashchange", revealCurrentSection);
    window.addEventListener("popstate", revealCurrentSection);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", revealCurrentSection);
      window.removeEventListener("popstate", revealCurrentSection);
    };
  }, []);
  return (
    <nav className="detail-section-navigation" aria-label="Build sections">
      {sections.map(([id, name]) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={() => requestAnimationFrame(revealCurrentSection)}
          aria-current={current === id ? "location" : undefined}
        >
          {name}
        </a>
      ))}
    </nav>
  );
}
