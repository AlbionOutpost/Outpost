import { notFound, redirect } from "next/navigation";
import { billingEnabled } from "@/lib/billing/stripe";
/** The tier is called Supporter now; the old address keeps working. */
export default async function Premium({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  // No paid plan while billing is off: the page does not exist.
  if (!billingEnabled()) notFound();
  const { region } = await searchParams;
  redirect(`/supporter${region ? `?region=${encodeURIComponent(region)}` : ""}`);
}
