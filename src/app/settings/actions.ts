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
import { deleteAccountRecord, verifyDeletionBilling } from "@/lib/account-deletion";
import { HttpError } from "@/lib/http-error";
import { avatarFrameIds } from "@/lib/avatar-frames";
import { signInPath } from "@/lib/sign-in-return";
import { cleanDisplayName, reservedDisplayName } from "@/lib/display-name";
const settings = z.object({
  name: z.string().trim().min(1).max(60),
  region: regionSchema,
  characterName: z
    .string()
    .trim()
    .max(40)
    .regex(/^[a-zA-Z0-9 _-]*$/),
  /** "none" or a listed frame (src/lib/avatar-frames.ts); anything else is rejected. */
  avatarFrame: z
    .enum(["none", ...avatarFrameIds])
    .transform((v) => (v === "none" ? null : v))
    .optional(),
  /** Sent only by accounts shown the Supporter badge toggle; absent leaves the stored choice. */
  supporterBadge: z.enum(["shown", "hidden"]).optional(),
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
  if (!session?.user?.id) redirect(signInPath("/settings"));

  const parsed = settings.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Check the display name, region, character name and frame. Your draft is retained.",
    };
  try {
    if (!(await rateLimit(`settings:${session.user.id}`, 20, 60)))
      return {
        error: "Too many requests or the request limiter is unavailable. Please retry later.",
      };
    // A name is checked when it changes; one saved before these rules stays as it was.
    const current = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });
    const { name, supporterBadge, ...fields } = parsed.data;
    const data = supporterBadge
      ? { ...fields, showSupporterBadge: supporterBadge === "shown" }
      : fields;
    // Unchanged: the stored name is left exactly as it is.
    const unchanged = name === current?.name?.trim();
    const clean = cleanDisplayName(name);
    if (!unchanged && !clean)
      return { error: "Enter a display name with visible letters. Your draft is retained." };
    if (!unchanged && reservedDisplayName(clean))
      return {
        error:
          "That name is reserved because it reads as Outpost or its staff. Pick another; your draft is retained.",
      };
    await db.user.update({
      where: { id: session.user.id },
      data: unchanged ? data : { ...data, name: clean },
    });
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
  if (!session?.user?.id) redirect(signInPath("/settings"));
  if (form.get("confirmation") !== "DELETE")
    return { error: "Type DELETE to confirm account deletion." };
  try {
    if (!(await rateLimit(`delete:${session.user.id}`, 3, 3600)))
      return {
        error: "Too many requests or the request limiter is unavailable. Please retry later.",
      };
    const clearance = await verifyDeletionBilling(session.user.id);
    await deleteAccountRecord(session.user.id, clearance);
  } catch (error) {
    if (error instanceof HttpError) return { error: error.message };
    logEvent("error", "settings_mutation_unavailable", { code: "SERVICE_UNAVAILABLE" });
    return {
      error:
        "Account deletion could not be completed. Please retry or reload to check your account.",
    };
  }
  redirect("/signin");
}
