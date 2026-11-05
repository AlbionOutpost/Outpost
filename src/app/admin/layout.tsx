import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin-nav";
import { privateMetadata } from "@/lib/seo";
import "./admin.css";
export const metadata = privateMetadata("Administration");
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/signin");
  const user = await db.user.findUnique({ where: { id: s.user.id }, select: { role: true } });
  if (!user || !["ADMIN", "MODERATOR"].includes(user.role)) notFound();
  return (
    <div className="admin-workspace">
      <AdminNav full={user.role === "ADMIN"} />
      <div className="admin-main">{children}</div>
    </div>
  );
}
