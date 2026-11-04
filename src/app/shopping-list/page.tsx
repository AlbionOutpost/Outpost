import { privateMetadata } from "@/lib/seo";
import { ShoppingWorkspace } from "@/components/shopping-workspace";
export const metadata = privateMetadata("Shopping list");
export default function Page() {
  return <ShoppingWorkspace />;
}
