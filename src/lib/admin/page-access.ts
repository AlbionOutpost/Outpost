import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "../auth";
import { requireAdmin } from "./access";
export async function adminPageActor() {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/signin");
  try {
    await requireAdmin(s.user.id);
  } catch {
    notFound();
  }
  return s.user.id;
}
