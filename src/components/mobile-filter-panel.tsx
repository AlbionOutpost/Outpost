"use client";
import { useId, useState, type ReactNode } from "react";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
export function MobileFilterPanel({
  children,
  label = "Filter builds",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false),
    id = useId();
  return (
    <div className={`responsive-filter-panel${open ? " expanded" : ""}`}>
      <button
        type="button"
        className="mobile-filter-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal size={17} />
        <span>{label}</span>
        <ChevronDown size={16} />
      </button>
      <div id={id} className="mobile-filter-content">
        {children}
      </div>
    </div>
  );
}
