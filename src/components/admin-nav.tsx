"use client";
import Link from "@/components/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Flag, ScrollText, ShieldAlert, ArrowUpRight } from "lucide-react";
export function AdminNav({ full }: { full: boolean }) {
  const path = usePathname();
  return (
    <aside className="panel admin-rail">
      <nav aria-label="Administration">
        {[
          ...(full
            ? [
                { href: "/admin", label: "Overview", Icon: LayoutDashboard },
                { href: "/admin/users", label: "Users & access", Icon: Users },
                { href: "/admin/review", label: "Account review", Icon: ShieldAlert },
              ]
            : []),
          { href: "/admin/reports", label: "Content reports", Icon: Flag },
          ...(full ? [{ href: "/admin/audit", label: "Audit trail", Icon: ScrollText }] : []),
        ].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={
              (href === "/admin" ? path === href : path.startsWith(href)) ? "page" : undefined
            }
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      <p>Permissions are checked on every request.</p>
      <Link href="/" className="pill-link is-small admin-return">
        Back to Outpost <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </aside>
  );
}
