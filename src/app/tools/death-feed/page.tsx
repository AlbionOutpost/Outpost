import { redirect } from "next/navigation";
/** Kills and deaths are two views of one feed; the old address keeps working. */
export default async function DeathFeed({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const { region } = await searchParams;
  redirect(`/tools/kill-feed?view=deaths${region ? `&region=${encodeURIComponent(region)}` : ""}`);
}
