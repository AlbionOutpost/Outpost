"use client";
import { useEffect, useState } from "react";
import type { MasteryLevels } from "@/lib/albion/focus";
import { readMasteryLevels, writeMasteryLevels } from "@/lib/mastery-storage";
import { saveAccountLevels, useAccountSaves } from "./account-saves";

/**
 * Specialization levels shared by the Specialization & focus page and every calculator: on the
 * account when signed in, in this browser for guests.
 */
export function useMasteryLevels() {
  const account = useAccountSaves();
  const [device, setDevice] = useState<{ levels: MasteryLevels; loaded: boolean }>({
    levels: {},
    loaded: false,
  });
  useEffect(() => {
    // Hydrate from this device after mount so server and client markup match.
    if (!account.userId)
      queueMicrotask(() => setDevice({ levels: readMasteryLevels(), loaded: true }));
  }, [account.userId]);
  if (account.userId)
    return {
      where: "account" as const,
      levels: account.data?.levels ?? {},
      loaded: account.status === "ready",
      error: account.status === "error" ? account.error : "",
      saving: account.levels,
      retry: account.retry,
      /** Always accepted here; the write itself reports through `saving`. */
      save: (next: MasteryLevels) => (saveAccountLevels(next), true),
    };
  return {
    where: "device" as const,
    levels: device.levels,
    loaded: device.loaded,
    error: "",
    saving: "saved" as const,
    retry: () => undefined,
    save: (next: MasteryLevels) => {
      setDevice({ levels: next, loaded: true });
      return writeMasteryLevels(next);
    },
  };
}
