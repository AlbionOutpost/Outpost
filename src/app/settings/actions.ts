"use server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { regionSchema } from "@/lib/albion/region-config";
import { rateLimit } from "@/lib/redis";
import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logEvent } from "@/lib/logging";
const settings = z.object({
  name: z.string().trim().min(1).max(60),
  region: regionSchema,
  characterName: z
    .string()
    .trim()
    .max(40)
    .regex(/^[a-zA-Z0-9 _-]*$/),
});
export type SettingsActionState = { error: string };
export async function saveSettings(
  _previous: SettingsActionState,
  form: FormData,
): Promise<SettingsActionState> {
  let session: Session | null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    logEvent("error", "settings_session_unavailable", { code: "SERVICE_UNAVAILABLE" });
    return { error: "Account service unavailable. Your draft is retained; retry later." };
  }
  if (!session?.user?.id) redirect("/signin");

  const parsed = settings.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Check the display name, region and character name. Your draft is retained." };
  try {
    if (!(await rateLimit(`settings:${session.user.id}`, 20, 60)))
      return {
        error: "Too many requests or the request limiter is unavailable. Please retry later.",
      };
    await db.user.update({ where: { id: session.user.id }, data: parsed.data });
    (await cookies()).set("atlas-region", parsed.data.region, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      secure: process.env.NEXTAUTH_URL?.startsWith("https://"),
    });
    revalidatePath("/", "layout");
  } catch {
    logEvent("error", "settings_mutation_unavailable", { code: "SERVICE_UNAVAILABLE" });
    return {
      error:
        "Could not confirm the save. Your draft is retained; retry or reload to check saved values.",
    };
  }
  redirect(`/settings?saved=1&region=${parsed.data.region}`);
}
export async function deleteAccount(
  _previous: SettingsActionState,
  form: FormData,
): Promise<SettingsActionState> {
  let session: Session | null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    logEvent("error", "settings_session_unavailable", { code: "SERVICE_UNAVAILABLE" });
    return { error: "Account service unavailable. Your draft is retained; retry later." };
  }
  if (!session?.user?.id) redirect("/signin");
  if (form.get("confirmation") !== "DELETE")
    return { error: "Type DELETE to confirm account deletion." };
  try {
    if (!(await rateLimit(`delete:${session.user.id}`, 3, 3600)))
      return {
        error: "Too many requests or the request limiter is unavailable. Please retry later.",
      };
    if (await db.group.count({ where: { ownerId: session.user.id } }))
      return {
        error: "Transfer group ownership or delete owned groups before deleting this account.",
      };
    await db.user.delete({ where: { id: session.user.id } });
  } catch {
    logEvent("error", "settings_mutation_unavailable", { code: "SERVICE_UNAVAILABLE" });
    return {
      error:
        "Account deletion could not be completed. Please retry or reload to check your account.",
    };
  }
  redirect("/signin");
}
