"use client";
import type { ComponentProps } from "react";

/**
 * The sort select of a build list. Choosing an order applies it straight away by submitting
 * the select's form; without scripts the form's own submit button still applies it.
 */
export function BuildSortSelect(props: ComponentProps<"select">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
