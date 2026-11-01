import { z } from "zod";
export const targetKind = z.enum(["build", "composition"]);
export const communityAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("favorite"), active: z.boolean() }),
  z.object({ action: z.literal("vote"), active: z.boolean() }),
  z.object({ action: z.literal("comment"), body: z.string().trim().min(3).max(3000) }),
  z.object({
    action: z.literal("edit-comment"),
    commentId: z.string().max(100),
    version: z.number().int().positive(),
    body: z.string().trim().min(3).max(3000),
  }),
  z.object({
    action: z.literal("delete-comment"),
    commentId: z.string().max(100),
    version: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("report"),
    reason: z.string().trim().min(10).max(2000),
    commentId: z.string().max(100).optional(),
  }),
]);
export const moderatorAction = z.object({
  reportId: z.string().max(100),
  version: z.number().int().positive(),
  action: z.enum(["hide", "restore", "resolve", "dismiss"]),
  note: z.string().trim().min(10).max(2000),
});
