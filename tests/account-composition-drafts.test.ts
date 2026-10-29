import { expect, it } from "vitest";
import { AccountBuildDraftCache } from "@/lib/account-build-drafts";
import type { CompositionInput } from "@/lib/compositions/validation";
const draft = {
  title: "",
  slots: [],
  region: "asia",
  notes: "Unfinished private party",
} as unknown as CompositionInput;
it("recovers unfinished party values and the original server revision as independent copies", () => {
  const cache = new AccountBuildDraftCache<CompositionInput>();
  const lease = cache.activate("owner");
  cache.remember("owner", "composition:one", lease, draft, 4);
  const recovered = cache.read("owner", "composition:one")!;
  expect(recovered.baseVersion).toBe(4);
  recovered.draft.notes = "Changed returned copy";
  expect(cache.read("owner", "composition:one")!.draft.notes).toBe(draft.notes);
  expect(cache.read("owner", "composition:two")).toBeUndefined();
  expect(cache.read("other", "composition:one")).toBeUndefined();
});
it("keeps copied source contexts distinct and invalidates previous owner's outstanding writers", () => {
  const cache = new AccountBuildDraftCache<CompositionInput>();
  const lease = cache.activate("alice");
  cache.remember("alice", "new:axe:asia", lease, draft);
  expect(cache.read("alice", "new:axe:europe")).toBeUndefined();
  cache.activate("bob");
  expect(cache.read("alice", "new:axe:asia")).toBeUndefined();
  expect(cache.remember("alice", "new:axe:asia", lease, draft)).toBe(false);
  const bob = cache.activate("bob");
  cache.remember("bob", "comp", bob, draft, 2);
  cache.clear();
  expect(cache.remember("bob", "comp", bob, draft, 2)).toBe(false);
  expect(cache.read("bob", "comp")).toBeUndefined();
});
