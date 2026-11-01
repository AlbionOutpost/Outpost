import { redirect } from "next/navigation";
/** The tier is called Supporter now; the old address keeps working. */
export default async function Premium({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  const { region } = await searchParams;
  redirect(`/supporter${region ? `?region=${encodeURIComponent(region)}` : ""}`);
}
