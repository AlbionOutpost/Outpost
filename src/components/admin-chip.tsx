import type { ReactNode } from "react";

/** A small status or role label. Tones: default (neutral), accent (Supporter, staff), danger, warn. */
export function AdminChip({
  tone = "default",
  children,
}: {
  tone?: "default" | "accent" | "danger" | "warn";
  children: ReactNode;
}) {
  return (
    <span className="admin-chip" data-tone={tone}>
      {children}
    </span>
  );
}

export const roleLabel = (role: string) =>
  role === "ADMIN" ? "Administrator" : role === "MODERATOR" ? "Moderator" : "";
