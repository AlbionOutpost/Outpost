import { WorkspaceHeading } from "@/components/workspace-heading";
import { AvalonMapper } from "@/components/avalon-mapper";
export const metadata = { title: "Roads of Avalon mapper" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        title="Roads of Avalon mapper"
        description="Track portal connections and their time left, and find the fewest-portal route home."
      />
      <AvalonMapper />
    </>
  );
}
