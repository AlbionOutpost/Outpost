import { notFound, redirect } from "next/navigation";
import { billingEnabled } from "@/lib/billing/stripe";
import { launchOpen } from "@/lib/billing/plan";
/** The tier is called Supporter now; the old address keeps working. */
export default async function Premium({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  // The Supporter page exists while billing is on or the launch grant is open.
  if (!billingEnabled() && !launchOpen()) notFound();
  const { region } = await searchParams;
  redirect(`/supporter${region ? `?region=${encodeURIComponent(region)}` : ""}`);
}
