import { WorkspaceHeading } from "@/components/workspace-heading";
import { History } from "@/components/history";
export const metadata = { title: "Gold price history" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        glyph="history"
        scene="market"
        title="Gold price history"
        description="Inspect regional gold observations and their timestamps. Choose your server in the navigation."
      />
      <History kind="gold" autoLoad />
    </>
  );
}
