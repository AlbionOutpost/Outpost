import { z } from "zod";
const url = z.string().url();
export const environmentSchema = z
  .object({
    DATABASE_URL: url.refine((v) => /^postgres(ql)?:/.test(v)).optional(),
    REDIS_URL: url.refine((v) => /^rediss?:/.test(v)).optional(),
    OUTPOST_RUNTIME: z.enum(["node", "cloudflare"]).optional(),
    NEXTAUTH_URL: url,
    NEXTAUTH_SECRET: z.string().min(32),
    DISCORD_CLIENT_ID: z.string().optional(),
    DISCORD_CLIENT_SECRET: z.string().optional(),
    OUTPOST_OWNER_DISCORD_ID: z
      .string()
      .regex(/^\d{17,20}$/)
      .or(z.literal(""))
      .optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_SUPPORTER: z.string().optional(),
    NODE_ENV: z.string().optional(),
  })
  .superRefine((e, ctx) => {
    if (e.OUTPOST_RUNTIME !== "cloudflare") {
      for (const key of ["DATABASE_URL", "REDIS_URL"] as const)
        if (!e[key])
          ctx.addIssue({ code: "custom", path: [key], message: "Node runtime dependency missing" });
    }
    if (Boolean(e.DISCORD_CLIENT_ID) !== Boolean(e.DISCORD_CLIENT_SECRET))
      ctx.addIssue({
        code: "custom",
        path: ["DISCORD_CLIENT_ID"],
        message: "Discord credentials must be configured together",
      });
    const stripe = [e.STRIPE_SECRET_KEY, e.STRIPE_WEBHOOK_SECRET, e.STRIPE_PRICE_SUPPORTER];
    if (stripe.some(Boolean) && !stripe.every(Boolean))
      ctx.addIssue({
        code: "custom",
        path: ["STRIPE_SECRET_KEY"],
        message:
          "Stripe secret key, webhook secret and Supporter price must be configured together",
      });
    const target = new URL(e.NEXTAUTH_URL);
    if (
      e.NODE_ENV === "production" &&
      target.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)
    )
      ctx.addIssue({
        code: "custom",
        path: ["NEXTAUTH_URL"],
        message: "Public production origins require HTTPS",
      });
  });
export function validateEnvironment(input: Record<string, string | undefined>) {
  const result = environmentSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Invalid server configuration: ${[...new Set(result.error.issues.map((i) => i.path.join(".") || "environment"))].join(", ")}`,
    );
  return result.data;
}
