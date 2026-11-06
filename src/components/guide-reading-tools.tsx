"use client";
import { Printer } from "lucide-react";

/** The guide's one reading action, beside "All guides" in the masthead: print it. */
export function GuideReadingTools() {
  return (
    <button type="button" className="pill-link is-small" onClick={() => window.print()}>
      <Printer size={14} aria-hidden="true" />
      Print guide
    </button>
  );
}
