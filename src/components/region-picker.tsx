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

/** Original globe marks: the band of the globe where the server's players are is lit. */
function RegionMark({ region, size = 18 }: { region: Region; size?: number }) {
  const band =
    region === "americas"
      ? "M8.7 3.09A9.5 9.5 0 0 0 8.7 20.91Z"
      : region === "europe"
        ? "M8.7 3.09A9.5 9.5 0 0 1 15.3 3.09V20.91A9.5 9.5 0 0 1 8.7 20.91Z"
        : "M15.3 3.09A9.5 9.5 0 0 1 15.3 20.91Z";
  return (
    <svg
      className="region-mark"
      data-region={region}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9.5"
        fill="var(--region-sea)"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d={band} fill="currentColor" opacity="0.85" />
      <ellipse
        cx="12"
        cy="12"
        rx="3.3"
        ry="9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
        opacity="0.5"
      />
      <path
        d="M2.5 12h19M4.2 7.5h15.6M4.2 16.5h15.6"
        stroke="currentColor"
        strokeWidth="0.7"
        opacity="0.5"
      />
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
        <RegionMark region={value} />
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
