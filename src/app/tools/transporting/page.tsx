import { WorkspaceHeading } from "@/components/workspace-heading";
import { TransportCalculator } from "@/components/transport-calculator";
export const metadata = { title: "Transport calculator" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => (typeof params[key] === "string" ? params[key] : undefined);
  return (
    <>
      <WorkspaceHeading
        glyph="transport"
        scene="economy"
        title="Transport calculator"
        description="Compare city prices against cargo weight, carrying capacity, fees and your risk budget."
      />
      <TransportCalculator
        initial={{
          item: value("item"),
          from: value("from"),
          to: value("to"),
          quality: value("quality"),
        }}
      />
    </>
  );
}
