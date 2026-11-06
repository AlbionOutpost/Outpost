import { privateMetadata } from "@/lib/seo";
import { ShoppingWorkspace } from "@/components/shopping-workspace";
export const metadata = privateMetadata("Crafting Planner");
export default function Page() {
  return <ShoppingWorkspace />;
}
