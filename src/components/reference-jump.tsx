"use client";
import { WellSelect } from "./well-select";

/** On phones, the reference sections as one select that jumps to the chosen table. */
export function ReferenceJump({
  sections,
  className,
}: {
  sections: { slug: string; title: string }[];
  className?: string;
}) {
  return (
    <label className={className}>
      Jump to a table
      <WellSelect
        defaultValue=""
        onChange={(e) => {
          const target = document.getElementById(e.target.value);
          if (!target) return;
          target.scrollIntoView({ block: "start" });
          target.focus({ preventScroll: true });
          history.replaceState(history.state, "", `#${e.target.value}`);
        }}
      >
        <option value="" disabled>
          Choose a table
        </option>
        {sections.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.title}
          </option>
        ))}
      </WellSelect>
    </label>
  );
}
