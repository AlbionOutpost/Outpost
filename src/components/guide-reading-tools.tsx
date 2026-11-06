"use client";
import { Printer } from "lucide-react";

/** The guide's one reading action, in the masthead: print it (the print sheet drops the chrome). */
export function GuideReadingTools() {
  return (
    <button type="button" className="button secondary" onClick={() => window.print()}>
      <Printer size={16} aria-hidden="true" />
      Print guide
    </button>
  );
}
