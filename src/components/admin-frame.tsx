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
  titleChips,
  closing,
  children,
}: {
  title: string;
  accent?: string;
  description: string;
  /** File name under /albion/icons. */
  emblem: string;
  actions?: ReactNode;
  /** Status chips set beside the title (an account's plan and role). */
  titleChips?: ReactNode;
  /** The closing band, full width under the rail and panels. */
  closing?: ReactNode;
  children: ReactNode;
}) {
  const role = await adminRole();
  return (
    <>
      {titleChips ? (
        <header className="workspace-identity" data-scene="page">
          <div className="workspace-identity-copy">
            <div className="workspace-identity-head">
              <span className="workspace-emblem" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied emblem */}
                <img
                  className="painted-emblem"
                  src={`/albion/icons/${emblem}.webp`}
                  alt=""
                  width={64}
                  height={64}
                />
              </span>
              <div>
                <div className="admin-title-row">
                  <h1 className="page-title display-title">{accentedName(title, accent)}</h1>
                  {titleChips}
                </div>
                <p className="intro">{description}</p>
              </div>
            </div>
          </div>
          {actions && <div className="workspace-identity-actions">{actions}</div>}
        </header>
      ) : (
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
        />
      )}
      <div className="admin-workspace">
        <AdminNav full={role === "ADMIN"} />
        <div className="admin-main">{children}</div>
      </div>
      {closing}
    </>
  );
}

/** The title with its accent word in ember, as WorkspaceHeading sets it. */
function accentedName(title: string, accent?: string) {
  const at = accent ? title.lastIndexOf(accent) : -1;
  if (!accent || at < 0) return title;
  return (
    <>
      {title.slice(0, at)}
      <em>{accent}</em>
      {title.slice(at + accent.length)}
    </>
  );
}
