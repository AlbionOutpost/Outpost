import { AccountBuildDraftCache, accountLogoutEvent } from "./account-build-drafts";
import type { CompositionInput } from "./compositions/validation";

// Reuse the same owner/lease/TTL/size bounds as build recovery. No browser storage.
export const accountCompositionDrafts = new AccountBuildDraftCache<CompositionInput>();
if (typeof window !== "undefined") {
  window.addEventListener(accountLogoutEvent, (event) => {
    // Dirty editors may cancel sign-out. Clear only after all synchronous handlers.
    queueMicrotask(() => {
      if (!event.defaultPrevented) accountCompositionDrafts.clear();
    });
  });
}
