"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Region } from "@/lib/albion/region-config";

/** Server names as the game lists them; the market data mirrors the same split. */
const choices: { value: Region; label: string; server: string }[] = [
  { value: "europe", label: "Europe", server: "Albion Europe" },
  { value: "americas", label: "Americas", server: "Albion West" },
  { value: "asia", label: "Asia", server: "Albion East" },
];

/**
 * Each server's half of the world on a small globe: an orthographic view centred on the region
 * (Europe and Africa, the Americas, East Asia and Oceania), land from Natural Earth's 1:110m
 * outlines (public domain), projected and simplified to icon resolution offline.
 */
const globes: Record<Region, { land: string; grid: string }> = {
  europe: {
    land: "M17.7 18.5l-1.1 1.4 0.3-0.8zM6.4 8l-0.3 0.7-0.2-0.5zM10.1 10.1l-0.3 0 0.1-0.3 0.4-0.2zM10.7 9.2l0.3 1-0.2 0.3-0.7 0zM10.3 7.8l-0.2 0.3-0.5-0.2 0.2-0.3zM3.4 7.9l-0.8 3.2 1.1 4.2 1.4 1.7-0.3 0.5 0.2 0.7-1.1-1.2-1.3-3.4 0-3.2zM6.7 4.1l4.4-1.5 0.6 0-0.6 0.1 0.7 0-0.3 0.2 0.5 0-0.4 0.1 0.3 0.1-1.6 0.3-1.1 0.6-0.7 0.7 0.7 0-0.6 0.2 0 0.4-0.8-0.3-0.8 0.2-0.9 1.2 1.5-0.7-1 2.2-1.1-0.5 0.5 0.2-0.4 0.3 0.1 0.4-0.4-0.2 0.1-0.3-0.4 0.2-0.2-0.3 0.1 0.2-0.5 0 0.1-0.2-1.1 1.1 0.7-1.8-0.3 0.1-0.3 0.8 1.6-2.5zM9.8 4.2l-0.9 0.3 0.4-0.5zM9.3 5l-0.9 1.2-0.3 0.1 0-0.3-0.5 0.4 0.3-0.8 0.5 0.1 0.5-0.8zM14.2 6.8l-0.4-0.1 0-0.8zM16.3 11.2l0.3 0.5 0.5-0.2-0.4-0.4 0.2-0.2-0.7-0.3 0.1-0.5-0.5 0.7zM21.5 11.7l-0.3-1.1-0.2 0.3-0.4-0.6 0 3.3-0.9-1.3-0.1 0.3-0.6-0.3-1.4 0.8-0.7-0.3 0.6 0.8 0.4-0.7 0.6 0.3-0.3 1.2-1.2 1.3-1.8-2.1 0 0.3-0.3-0.2 1 1.5 1 0.8 0.9-0.6 0.1 0.2-0.5 1.3-1.1 1.3 0.1 1.1-2.5 1.8-1 0.1-0.8-0.8-0.2-0.3 0.4-0.4-0.1-0.5-0.7-0.7-0.1-0.8-2.6-0.3-1.3-1.5 0.2-1.4 1.9-1.7 2.3 0-0.2 0.5 1.3 0.6 0.3-0.5 1.8 0 0-1-0.7 0.3-0.6-0.2 0.3-0.6 1.4-0.4-0.7-0.4 0.2-0.4-0.5 0.6-0.4-0.3 0 1-0.8 0.2 0.2 0.6-1.3-1.4 0 0.5 0.6 0.3-0.3 0.5-0.9-1.1-0.7 0.2-0.8 0.9-0.8-0.2 0.2-1 0.8 0.1 0.2-0.4-0.3-0.5 1.4-0.6 0.1-0.6 0.5 0.6 0.9-0.6-0.1-0.4 0.4-0.2-0.6 0.1 0.1-0.9-0.5 0.5 0 1.1-0.3 0.1-0.2-0.7-0.3 0.3-0.2-0.3 1-1.6 0.5-0.2 0.9 0.3-0.1 0.3-0.3-0.1 0.4 0.4 0-0.8 0.3 0.2 0.4-0.8 0.5 0-0.7-0.6 1 0.6-0.7-0.5 0.2-0.3-0.8-1 0.6 0-0.2-0.5 0.3-0.2-0.9-0.8-1.1-0.3 0.2-0.3 2.5 0.3-1.3 0 2.5 1-0.2-0.3 0.4 0.1 2.1 1.5 0.2 0.3-0.4-0.2 0.1 0.3 0.9 0.6 0.7 1.1 0.8 2zM10.9 5.1l-1.2 0 0.1-0.3 0.9 0zM11.3 5.5l0.1 0.4-1.1 1.2-1.5 0.1-0.8 0.4 0.2-0.7 0.9-0.5 0.9-1.2z",
    grid: "M13.3 2.6l-0.6 0.6M10 2.7l1 0.6M6.3 4.4l1.5-0.6 1.8 0.1M2.9 9.1l1.3-2 1.2-1 3.4-1.2M3.5 16.1l-0.5-2.2 0.5-2.5 2.1-3 3.3-2.4M7.1 20.1l-0.9-0.9-0.5-1.3 0.3-3.9 1.5-3.7 2.3-3.3M10.7 21.4l-0.6-1.7 0-4.3 1.2-7.9M14 21.3l0.5-0.5 0.4-1.3-0.1-4.2-1.8-7.9M17.7 19.6l0.8-1 0.5-1.4-0.4-3.6-1.6-3.6-2.6-3.2M21.1 14.9l0.2-2-0.6-2.1-2.1-2.9-3.4-2.1M20.5 7.9l-0.9-1.4-1.2-0.9-3.3-0.9M16.9 3.9l-1.2-0.4-1.5 0.3M6 19.3l1.9 1.2 3.8 0.8 3.7-0.6 1.4-0.5 1.2-0.9M2.5 12l0.2 1.4 0.7 1.3 1.9 1.8 2.4 1.2 4 0.7 4-0.5 3.1-1.4 2.2-2.4 0.5-2.1M6 4.7l-1.1 1.1-0.7 1.7 0.1 1.4 0.5 1.1 1.7 1.7 1.4 0.7 3.8 0.8 3.7-0.5 2.2-1.1 1.5-1.5 0.7-1.7-0.1-1.4-0.5-1.1-1.2-1.2M12.7 3.2l-2.2 0.2-1.2 0.7-0.5 0.8 0.3 1.5 2.1 1.1 1.7 0 1.7-0.8 0.6-0.9-0.3-1.5-0.9-0.7-1.3-0.4",
  },
  americas: {
    land: "M13.5 10.7l0.6 0.2-0.8 0.1zM12.4 10.2l0.8 0.5-1.2-0.5-0.5 0.2zM14.6 5.9l0.6 0.5-0.7 0zM15.5 3.8l0.3 0.3-0.5-0.1zM11.5 4l0.5 0.2-1 0.6 0.1 0.5 0.9 0.2 0.3 0.5 0-1.3 0.9 0.4 0.2-0.2 1.2 0.8-1.4 0.9 0.5-0.4 0.3 0.4 0.5 0-0.5 0.4-0.2-0.3-0.4 0.3 0.1 0.3-0.4 0 0.2 0.1-0.5 0.5-0.1-0.2 0.1 0.6-0.7 0.5 0.1 1-0.5-0.8-1.9 0.3 0 1.5 0.6 0.1 0.8-0.5-0.3 1 0.8 0 0.3 1.1 0.8 0 0.9-0.6 0 0.6 0.2-0.6 0.3 0.3 1-0.1 0.7 0.7 0.7 0 0.3 0.9 2 0.5-1.1 2.7-1.1 0.6-1 1.2-0.6 0 0 0.5-1 0.3-0.9 1.1-0.4 0-0.1-0.5 0.8-1.5 0.3-1.8-0.8-0.5-0.9-1.3 0.2-1.2 0.5-0.5-0.2-0.8-0.7 0.2-0.8-0.9-2.3-0.9-1-2.3 0.1 1.4-0.5-0.9-0.3-2 0.8-1-0.2-0.4 0.3-1-0.2-0.4-0.4 0.1 0.3-0.2-1.2 0.4 2-1.2 1.8 0.7 0.8 0.1 0.1-0.4zM10.5 3.6l0.4 0-0.1 0.4-0.7-0.1zM11.8 3.7l1 0.2 0.5 0.3-0.4 0.1 0.4 0.3-1.1-0.1 0.4-0.4-1-0.2zM10.1 3.7l-0.2-0.1 0.3-0.2 0.3 0.1zM21.5 11.3l-0.4 0.5-0.7-1-0.9-4.5 1.3 2.1zM18.9 5.5l0.5 0.5-0.6-0.5 0.7 1.2-0.2 0.2-2.1-2.9-2.3-1 2.5 1.1zM12.3 3l-0.1 0.4-0.5 0 0.2-0.4zM12.9 2.9l1.9 0.7-0.2 0.6 0.4 0.5-2.6-1.3z",
    grid: "M4.1 6.7l2.1-2.2 2.6-1.3M7.7 20.4l-2.4-1.8-1.6-2.7-0.5-3.1 0.5-3.3 0.9-1.9 2.7-3 1.7-1.1M10 21.3l-2-1.4-1.3-2.6-0.5-3.3 0.3-3.7 1.4-3.8 2.1-2.7M11.5 21.4l-0.7-3.7-0.1-3.3 0.8-10.5M13.2 21.4l1.2-1.3 0.8-2.5 0.4-3.4-0.3-3.7-0.8-3.8-1.3-2.8M14.6 21.1l2.5-1.4 1.7-2.7 0.7-3.4-0.5-3.6-1.7-3.7-2.7-2.6M19.9 17.3l0.9-1.9 0.5-2.1 0-2.1-0.5-2.1-2.1-3.5-1.6-1.3-1.9-0.9M16.3 3.6l-1.3-0.6M9.4 21.1l1.3 0.3 3.9-0.3M4.3 17.6l2.1 0.9 3.2 0.4 6.8-0.2 2.3-0.5 1-0.6M2.5 12l0.5 0.7 1.7 0.6 6 0.7 7.7-0.5 2.2-0.6 0.9-0.9M4.3 6.4l-0.1 0.4 1 0.7 5.4 0.8 7.1-0.5 2-0.8 0-0.6M4.3 6.4M8.8 3.2l0.5 0.5 1.1 0.2 3.2 0 1.5-0.4 0.1-0.4-0.6-0.2M9.4 2.9l-0.6 0.3",
  },
  asia: {
    land: "M4.2 16.3l0.3 1.2-0.7-1.2 0.2-0.3zM17.4 17.5l0.7 0.9-1.1 1.4-4 0.6-0.1-1.2 1.2-0.3 0.8-0.8 0.5 0.1 0.4-0.6 0.7 0-0.3 0.4 0.7 0.1 0.3-0.9zM16.2 16.2l1.4-0.1 0.8 0.6-1.8 0.4 0.1-0.5-1.1-0.3zM14.8 16.1l-0.8 0.2 0.1 0.3 0.4-0.2-0.3 0.2 0.3 0.5-0.4-0.4-0.2 0.5 0-0.9zM11.6 17.3l-0.6-0.3-1.1-1.5 1.4 0.9 0.4 0.5zM13.6 16.1l0.2 0.1-0.5 0.8-0.9-0.1-0.2-0.4 1.2-1.1 0.4 0.2zM15 15l-0.2 0.4-0.3-0.3-0.2 0.2 0.5-0.5zM14.1 13.5l0 0.5 0.5 0.4-0.6-0.2zM16.1 9.9l-0.4 0.8-0.6 0 0 0.5-0.2-0.3 1-1.1-0.1-0.5 0.3 0.1zM16 8.7l0.2 0.1-0.4 0.5-0.1-0.7zM15.5 7.8l0.3 0.7-0.7-1zM15.7 4.7l0.4 0.1-0.4 0 0.1 0.2-0.6-0.3zM16.9 3.8l-0.5 0 0.1 0.4 1 1.1-0.6-0.7 0.1 0.2-0.5 0-0.3-0.4-0.3 0.2-0.5-0.3-0.9-1.3-2-0.4 2 0.2zM9.6 5l0.1-0.3 0.9-0.1zM5.9 8.2l-0.3 0.3 0.3 0.5 0.4-1.2 0.4-0.2-0.5-0.1zM4.8 5.8l-1 1.9 0.4 1 0.6-0.6-0.3-0.3 0.2-0.6 0.3-0.1 0.5 0.7 0.2-0.8 0.3 0-0.5 0 0.1-0.4-0.6 0.5-0.2-0.3-0.4 0.5 1-1.5-0.8 0.9 0.7-1.1-0.5 0.2 1.3-1.2 0.9 0-0.6 0.4 0.1 0.3 0.8-0.1-0.1-0.3 1-0.4-1.6 0.4 1.1-0.8 1.3 0.2-0.4 0.7-0.2-0.2-0.4 0.3 0.9-0.2-0.1 0.3 0.8 0 0.2 0.3 0.5-0.5-0.6 0.8 0.6-0.6 1.4-0.4 1.4 0.6 0.8-0.4 1.1 0 0-0.3 1.2 0.5-0.3 0.8 0.6 1.3-0.9-1.6 0 0.7-0.9 0.3-0.2 0.7 0.6 0.1 0.2 0.5-0.1 1-0.8 0.9 0.4 0.7-0.3 0.2-0.3-0.9-0.5 0.2-0.1-0.3-0.4 0.4 0.7 0.1-0.4 0.5 0.5 1.1-0.6 0.8-1 0.6-0.3-0.3-0.5 0.5 0.5 0.6 0 0.7-0.6 0.4-0.8-0.8-0.1 0.6 0.8 1.3-1-1.1 0-1.3-0.6-0.1-0.3-1.1-1.7 0.8-0.2 0.9-0.5 0.1-0.2-2.2-1.8-1.8-0.1-0.8-0.3 1 0.2-0.2 0.1 0.5 0.3-0.2 0.1 0.9-1 0.5-0.8-0.2 0.4-3.2-0.5 2.8 0.1 0.8 0.6 0.4-1 1.3 0.5 2.6-0.9-2.2-0.3-3.3 0.7-2.9zM11.2 3.3l-1.7-0.2 1.4-0.5 1.1 0.2z",
    grid: "M19.8 17.4l0.8-1.5 0.4-1.8 0-1.8-0.5-1.9-2.1-3.4-3.3-2.4M20.7 8.1l-2.2-2.7-3.3-1.6M16.4 3.6l-2-0.5M13.4 2.6l-0.4 0.1M11.1 2.5l0.2 0.1M8.3 3.2l1.5-0.2M4.2 6.6l2-1.9 2.7-1.1M3.3 15.9l-0.6-2.9 0.6-3 2.1-3.3 3.4-2.3M7.6 20.4l-1.5-1.3-0.9-1.9-0.3-2.5 0.5-2.8 1.6-3.7 2.6-3.1M10.6 21.4l-0.8-0.7-0.6-1.8-0.1-2.6 0.1-3.2 0.7-4 1.1-3.5M12.9 21.5l0.6-0.7 0.5-4.4-0.1-3.2-1.2-7.6M15.7 20.8l1.5-1.2 0.9-2 0.3-2.5-0.4-2.9-1.5-3.8-2.3-3.1M4.8 18.2l2.1 1.4 4.7 0.9 3.9-0.4 2.6-1 1.1-0.9M21 13.4l0.5-1.4M2.5 12l0.5 1.5 2.5 1.8 3.2 0.9 2.8 0.3 3.3-0.2 2.6-0.6 2.8-1.4 0.8-0.9M19.4 8.3l0.4-1.4-0.6-1.1M4.8 5.8l-0.6 1.2 0.6 1.6 2.1 1.4 2.1 0.6 5.9 0 3-1 1.5-1.3M15.1 4.6l0.1-0.8-0.4-0.5-1.9-0.7-3 0.3-1.1 0.9 0.2 1 2 0.8 2.1 0 1.1-0.3 0.9-0.7",
  },
};

function RegionMark({ region, size = 18 }: { region: Region; size?: number }) {
  const globe = globes[region];
  const id = `region-globe-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      className="region-mark"
      data-region={region}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx="12" cy="12" r="9.6" />
        </clipPath>
        <radialGradient id={`${id}-light`} cx="34%" cy="28%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <circle className="region-mark-sea" cx="12" cy="12" r="9.6" />
      <g clipPath={`url(#${id}-clip)`}>
        <path className="region-mark-grid" d={globe.grid} />
        <path className="region-mark-land" d={globe.land} />
        <circle cx="12" cy="12" r="9.6" fill={`url(#${id}-light)`} />
      </g>
      <circle className="region-mark-rim" cx="12" cy="12" r="9.6" />
    </svg>
  );
}

export function RegionPicker({
  value,
  onChange,
}: {
  value: Region;
  onChange: (value: Region) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selected = choices.findIndex((c) => c.value === value);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  function choose(index: number) {
    setOpen(false);
    trigger.current?.focus();
    if (choices[index].value !== value) onChange(choices[index].value);
  }
  return (
    <div className="region-picker" ref={root}>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label="Albion region"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        data-region={value}
        className="region-picker-trigger"
        onClick={() => {
          setActive(selected);
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            setOpen(false);
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            return;
          }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? choices.length - 1
                  : !open
                    ? selected
                    : (active + (event.key === "ArrowDown" ? 1 : choices.length - 1)) %
                      choices.length;
            setActive(next);
            setOpen(true);
            return;
          }
          if (open && ["Enter", " "].includes(event.key)) {
            event.preventDefault();
            choose(active);
            return;
          }
          const index = choices.findIndex(
            (c) => c.label[0].toLowerCase() === event.key.toLowerCase(),
          );
          if (event.key.length === 1 && index >= 0) {
            event.preventDefault();
            setActive(index);
            setOpen(true);
          }
        }}
      >
        <RegionMark key={value} region={value} />
        <span>{choices[selected].label}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <div className="region-picker-panel">
          <div id={id} role="listbox" aria-label="Game servers">
            {choices.map((choice, index) => (
              <div
                key={choice.value}
                id={`${id}-${index}`}
                role="option"
                aria-label={choice.label}
                aria-selected={choice.value === value}
                data-active={active === index}
                onPointerMove={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <RegionMark region={choice.value} size={22} />
                <span className="region-option-text">
                  <span>{choice.label}</span>
                  <small>{choice.server}</small>
                </span>
                {choice.value === value && <Check size={16} aria-hidden="true" />}
              </div>
            ))}
          </div>
          <p className="region-picker-note">Each server has its own market and prices.</p>
        </div>
      )}
    </div>
  );
}
