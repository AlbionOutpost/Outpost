"use client";
import NextLink from "next/link";
import type { ComponentProps } from "react";

// Dynamic pages contain session-aware content. Fetch them when the player navigates,
// rather than rendering every visible card/header destination against Free quotas.
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} prefetch={prefetch} />;
}
