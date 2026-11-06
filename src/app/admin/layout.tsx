import { adminRole } from "@/components/admin-frame";
import { privateMetadata } from "@/lib/seo";
import "./admin.css";
export const metadata = privateMetadata("Administration");
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await adminRole();
  return <div className="admin-shell">{children}</div>;
}
