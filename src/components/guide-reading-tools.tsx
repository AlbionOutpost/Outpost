"use client";
import { Printer, ArrowUp } from "lucide-react";
export function GuideReadingTools() {
  return (
    <div className="guide-reading-tools">
      <button type="button" className="button secondary" onClick={() => window.print()}>
        <Printer size={15} />
        Print guide
      </button>
      <a className="text-link" href="#guide-title">
        <ArrowUp size={15} />
        Back to title
      </a>
    </div>
  );
}
