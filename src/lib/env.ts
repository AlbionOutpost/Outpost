import { z } from "zod";
const url = z.string().url();
export const environmentSchema = z
  .object({
    DATABASE_URL: url.refine((v) => /^postgres(ql)?:/.test(v)),
    REDIS_URL: url.refine((v) => /^rediss?:/.test(v)),
    NEXTAUTH_URL: url,
    NEXTAUTH_SECRET: z.string().min(32),
    DISCORD_CLIENT_ID: z.string().optional(),
    DISCORD_CLIENT_SECRET: z.string().optional(),
    NODE_ENV: z.string().optional(),
  })
  .superRefine((e, ctx) => {
    if (Boolean(e.DISCORD_CLIENT_ID) !== Boolean(e.DISCORD_CLIENT_SECRET))
      ctx.addIssue({
        code: "custom",
        path: ["DISCORD_CLIENT_ID"],
        message: "Discord credentials must be configured together",
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
