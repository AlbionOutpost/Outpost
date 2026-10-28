"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import type { Region } from "@/lib/albion/region-config";

const choices: { value: Region; label: string }[] = [
  { value: "europe", label: "Europe" },
  { value: "americas", label: "Americas" },
  { value: "asia", label: "Asia" },
];

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
        <Globe2 size={16} aria-hidden="true" />
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
                aria-selected={choice.value === value}
                data-active={active === index}
                onPointerMove={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{choice.label}</span>
                {choice.value === value && <Check size={16} aria-hidden="true" />}
              </div>
            ))}
          </div>
          <p className="region-picker-note">Separate markets per region</p>
        </div>
      )}
    </div>
  );
}
