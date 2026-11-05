import { z } from "zod";
const reason = z.string().trim().min(5, "Explain the reason in at least 5 characters.").max(500);
export const adminQuery = z
  .object({
    q: z.string().trim().max(80).default(""),
    page: z.coerce.number().int().min(1).max(1000).default(1),
    filter: z.enum(["all", "supporters", "banned", "review"]).default("all"),
  })
  .strict();
export const userAction = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("grant"),
      days: z.union([z.literal(30), z.literal(90), z.literal(365), z.literal(0)]),
      reason,
      expectedUpdatedAt: z.string().datetime(),
    })
    .strict(),
  z
    .object({ action: z.literal("revoke-gift"), reason, expectedUpdatedAt: z.string().datetime() })
    .strict(),
  z
    .object({
      action: z.literal("revoke-sessions"),
      reason,
      expectedUpdatedAt: z.string().datetime(),
    })
    .strict(),
]);
export const banAction = z
  .object({
    discordId: z.string().regex(/^\d{17,20}$/),
    action: z.enum(["ban", "unban"]),
    days: z.union([z.literal(7), z.literal(30), z.literal(0)]),
    reason,
    version: z.number().int().min(0),
    confirmation: z.string(),
  })
  .strict()
  .superRefine((v, c) => {
    if (v.confirmation !== `${v.action === "ban" ? "BAN" : "UNBAN"} ${v.discordId}`)
      c.addIssue({
        code: "custom",
        message: "Type the displayed confirmation exactly.",
        path: ["confirmation"],
      });
  });
export type UserAction = z.infer<typeof userAction>;
export type BanAction = z.infer<typeof banAction>;
