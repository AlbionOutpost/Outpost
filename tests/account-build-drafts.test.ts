import { expect, it } from "vitest";
import { AccountBuildDraftCache } from "@/lib/account-build-drafts";
import type { BuildInput } from "@/lib/builds/validation";

const draft = { title: "Private unfinished draft", equipment: [] } as unknown as BuildInput;
it("recovers invalid intermediate values and their original revision without sharing references", () => {
  const cache = new AccountBuildDraftCache();
  const lease = cache.activate("owner");
  expect(cache.remember("owner", "build:a", lease, draft, 3)).toBe(true);
  const recovered = cache.read("owner", "build:a")!;
  expect(recovered).toEqual({ draft, baseVersion: 3 });
  recovered.draft.title = "Mutated copy";
  expect(cache.read("owner", "build:a")!.draft.title).toBe(draft.title);
  expect(cache.read("owner", "build:b")).toBeUndefined();
  expect(cache.read("someone-else", "build:a")).toBeUndefined();
});
it("clears on owner changes/logout and rejects writers holding an old session lease", () => {
  const cache = new AccountBuildDraftCache();
  const alice = cache.activate("alice");
  cache.remember("alice", "build:a", alice, draft, 1);
  const bob = cache.activate("bob");
  expect(cache.read("alice", "build:a")).toBeUndefined();
  expect(cache.remember("alice", "build:a", alice, draft, 1)).toBe(false);
  cache.remember("bob", "build:b", bob, draft, 2);
  cache.clear();
  expect(cache.read("bob", "build:b")).toBeUndefined();
  expect(cache.remember("bob", "build:b", bob, draft, 2)).toBe(false);
  cache.activate("bob");
  expect(cache.read("bob", "build:b")).toBeUndefined();
});
it("expires drafts and bounds entry count and payload size without truncating data", () => {
  let now = 0;
  const cache = new AccountBuildDraftCache(() => now, 100, 2, 100);
  const lease = cache.activate("owner");
  cache.remember("owner", "a", lease, draft, 1);
  cache.remember("owner", "b", lease, draft, 1);
  cache.remember("owner", "c", lease, draft, 1);
  expect(cache.read("owner", "a")).toBeUndefined();
  expect(cache.read("owner", "b")).toBeDefined();
  expect(cache.remember("owner", "c", lease, { ...draft, title: "x".repeat(101) }, 1)).toBe(false);
  expect(cache.read("owner", "c")).toBeUndefined();
  now = 100;
  expect(cache.read("owner", "b")).toBeUndefined();
  expect(cache.read("owner", "c")).toBeUndefined();
});
it("successful-save cleanup clears only that owner's matching build", () => {
  const cache = new AccountBuildDraftCache();
  const lease = cache.activate("owner");
  cache.remember("owner", "a", lease, draft, 1);
  cache.remember("owner", "b", lease, draft, 2);
  cache.forget("intruder", "a");
  expect(cache.read("owner", "a")).toBeDefined();
  cache.forget("owner", "a");
  expect(cache.read("owner", "a")).toBeUndefined();
  expect(cache.read("owner", "b")).toBeDefined();
});
