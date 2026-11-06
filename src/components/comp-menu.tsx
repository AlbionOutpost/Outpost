"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import styles from "./comps.module.css";

/**
 * A comp's secondary actions behind one button (share image, export, duplicate, delete). Opens
 * under the button, closes on Escape (focus returns to the button), outside click or when an
 * action inside asks it to.
 */
export function CompMenu({
  label = "More",
  children,
}: {
  label?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      ref={root}
      className={styles.menu}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        type="button"
        className="button secondary"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
        {label}
      </button>
      <div id={id} className={styles.menuPanel} hidden={!open} data-comp-menu="">
        {children(() => setOpen(false))}
      </div>
    </div>
  );
}
