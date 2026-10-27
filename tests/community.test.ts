import { it, expect } from "vitest";
import { communityAction, moderatorAction } from "../src/lib/community/validation";
it("requires bounded nonblank content and explicit optimistic revisions", () => {
  expect(communityAction.safeParse({ action: "comment", body: "   " }).success).toBe(false);
  expect(communityAction.safeParse({ action: "comment", body: "x".repeat(3001) }).success).toBe(
    false,
  );
  expect(
    communityAction.safeParse({
      action: "edit-comment",
      commentId: "x",
      body: "New comment",
      version: 0,
    }).success,
  ).toBe(false);
  expect(
    moderatorAction.safeParse({ reportId: "x", action: "hide", note: "A valid review note" })
      .success,
  ).toBe(false);
  expect(
    moderatorAction.safeParse({
      reportId: "x",
      action: "hide",
      version: 1,
      note: "A valid review note",
    }).success,
  ).toBe(true);
});
