import { headers } from "next/headers";
import { rateLimit } from "../redis";
import type { Region } from "./region-config";

/** Charge actual outbound attempts, including retries and multi-quality/URL-chunk fanout. */
export async function reserveCallerAttempt(region: Region) {
  if (process.env.OUTPOST_RUNTIME !== "cloudflare") return;
  const address = (await headers()).get("cf-connecting-ip");
  if (!address || !/^[0-9a-f:.]{3,45}$/i.test(address))
    throw new Error("Trusted source caller unavailable");
  if (!(await rateLimit(`upstream-caller:${region}:${address}`, 10, 60)))
    throw new Error("Your source request budget is exhausted. Please retry later.");
}
