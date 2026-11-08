import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "../auth";
import { requireAdmin } from "./access";
import { signInPath } from "../sign-in-return";
export async function adminPageActor() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect(signInPath("/admin"));
  try {
    await requireAdmin(s.user.id);
  } catch {
    notFound();
  }
  return s.user.id;
}
