"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { SlidersHorizontal, ChevronDown, X } from "lucide-react";
export function MobileFilterPanel({
  children,
  label = "Filter builds",
  drawer = false,
}: {
  children: ReactNode;
  label?: string;
  drawer?: boolean;
}) {
  const [open, setOpen] = useState(false),
    id = useId(),
    trigger = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null),
    close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!drawer || !open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const onResize = () => {
      if (window.innerWidth > 900) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    const triggerElement = trigger.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("resize", onResize);
      if (triggerElement?.isConnected) triggerElement.focus();
    };
  }, [drawer, open]);
  return (
    <div
      className={`responsive-filter-panel${drawer ? " filter-drawer" : ""}${open ? " expanded" : ""}`}
    >
      <button
        ref={trigger}
        type="button"
        className="mobile-filter-trigger"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup={drawer ? "dialog" : undefined}
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal size={17} />
        <span>{label}</span>
        <ChevronDown size={16} />
      </button>
      {drawer && open && (
        <button
          className="filter-drawer-backdrop"
          type="button"
          aria-label="Dismiss build filters"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}
      <div
        ref={panel}
        id={id}
        className="mobile-filter-content"
        role={drawer && open ? "dialog" : undefined}
        aria-modal={drawer && open ? true : undefined}
        aria-label={drawer && open ? label : undefined}
        onSubmitCapture={() => {
          if (drawer) setOpen(false);
        }}
        onClickCapture={(e) => {
          if (drawer && (e.target as HTMLElement).closest("a[href]")) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (!drawer || !open) return;
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
          }
          if (e.key === "Tab") {
            const controls = [
                ...panel.current!.querySelectorAll<HTMLElement>(
                  'a[href],button:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled])',
                ),
              ].filter((el) => el.getClientRects().length > 0),
              first = controls[0],
              last = controls.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        {drawer && (
          <div className="filter-drawer-heading">
            <h2>{label}</h2>
            <button
              ref={close}
              type="button"
              aria-label="Close build filters"
              onClick={() => setOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
