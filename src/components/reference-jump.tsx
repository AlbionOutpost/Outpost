"use client";
import { useEffect, useState } from "react";
import { WellSelect } from "./well-select";

/**
 * The reference tables' index: one table shows at a time (the `:target` section, the first by
 * default), chosen from this list on wide screens or the select on phones. Every table keeps its
 * own address (#slug), so links and the back button work.
 */
export function ReferenceJump({
  sections,
  jumpClassName,
  listClassName,
}: {
  sections: { slug: string; title: string }[];
  jumpClassName?: string;
  listClassName?: string;
}) {
  const [current, setCurrent] = useState(sections[0]?.slug);
  useEffect(() => {
    const read = () => {
      const slug = decodeURIComponent(location.hash.slice(1));
      setCurrent(sections.some((s) => s.slug === slug) ? slug : sections[0]?.slug);
    };
    read();
    // A client-side visit keeps the hash without setting :target; set it so the table shows.
    if (location.hash && !document.querySelector(":target")) location.replace(location.hash);
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, [sections]);
  const open = (slug: string) => {
    location.hash = slug;
    document.getElementById(slug)?.focus({ preventScroll: true });
  };
  return (
    <>
      <label className={jumpClassName}>
        Table
        <WellSelect value={current} onChange={(e) => open(e.target.value)}>
          {sections.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.title}
            </option>
          ))}
        </WellSelect>
      </label>
      <ul className={listClassName}>
        {sections.map((s) => (
          <li key={s.slug}>
            <a href={`#${s.slug}`} aria-current={current === s.slug ? "true" : undefined}>
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
