"use client";
import Link from "@/components/link";
import { Compass, Bookmark } from "lucide-react";
import { tools, toolGroups } from "@/lib/tool-directory";
import { ToolIcon } from "./tool-icon";
export function WorkspaceNavigation({ path, region }: { path: string; region: string }) {
  return (
    <aside className="workspace-navigation" aria-label="Tools and saved workspace">
      <nav aria-label="Workspace navigation">
        <Link
          className="workspace-overview"
          href={`/tools?region=${region}`}
          aria-current={path === "/tools" ? "page" : undefined}
        >
          <Compass size={18} />
          Tool directory
        </Link>
        {toolGroups.map((group) => (
          <section key={group}>
            <h2>{group}</h2>
            {tools
              .filter((t) => t.group === group)
              .map((t) => (
                <Link
                  key={t.href}
                  href={`${t.href}?region=${region}`}
                  aria-label={`Workspace: ${t.short}${t.short === t.title ? "" : ` · ${t.title}`}`}
                  title={t.title}
                  aria-current={path === t.href ? "page" : undefined}
                >
                  <ToolIcon name={t.icon} size={17} />
                  <span>{t.short}</span>
                </Link>
              ))}
          </section>
        ))}
      </nav>
      <Link
        className="workspace-saved"
        href={`/dashboard?region=${region}`}
        title="Your saved workspace"
      >
        <Bookmark size={17} />
        <span>
          Your saved workspace<small>Builds, plans & reminders</small>
        </span>
      </Link>
    </aside>
  );
}
