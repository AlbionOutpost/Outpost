import { cache, type ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceHeading } from "@/components/workspace-heading";
import { AdminNav } from "@/components/admin-nav";

/** The signed-in staff role, read once per request (the layout gate and the frame share it). */
export const adminRole = cache(async () => {
  const s = await getServerSession(authOptions);
  if (!s?.user?.id) redirect("/signin");
  const user = await db.user.findUnique({ where: { id: s.user.id }, select: { role: true } });
  if (!user || !["ADMIN", "MODERATOR"].includes(user.role)) notFound();
  return user.role;
});

/** Masthead, section rail and the page's panels, so every admin view reads as one workspace. */
export async function AdminFrame({
  title,
  accent,
  description,
  emblem,
  actions,
  chips,
  closing,
  children,
}: {
  title: string;
  accent?: string;
  description: string;
  /** File name under /albion/icons. */
  emblem: string;
  actions?: ReactNode;
  chips?: ReactNode;
  /** The closing band, full width under the rail and panels. */
  closing?: ReactNode;
  children: ReactNode;
}) {
  const role = await adminRole();
  return (
    <>
      <WorkspaceHeading
        title={title}
        accent={accent}
        description={description}
        actions={actions}
        emblem={
          // eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem
          <img
            className="painted-emblem"
            src={`/albion/icons/${emblem}.webp`}
            alt=""
            width={64}
            height={64}
          />
        }
      >
        {chips}
      </WorkspaceHeading>
      <div className="admin-workspace">
        <AdminNav full={role === "ADMIN"} />
        <div className="admin-main">{children}</div>
      </div>
      {closing}
    </>
  );
}
