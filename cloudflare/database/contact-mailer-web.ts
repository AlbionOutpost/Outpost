import { getCloudflareContext } from "@opennextjs/cloudflare";
import { HttpError } from "../../src/lib/http-error";
import { logEvent } from "../../src/lib/logging";
import type { ContactMail } from "../../src/lib/contact";

type SendEmailBinding = { send(message: ContactMail): Promise<{ messageId: string }> };

/**
 * Cloudflare: one plain-text mail through the web Worker's `send_email` binding `CONTACT_EMAIL`
 * (set by scripts/cloudflare-release-config.mjs and locked to support@albionoutpost.com). A
 * deployment without it answers 503 rather than pretending the message went out.
 */
export async function sendContactMail(mail: ContactMail): Promise<void> {
  const env = getCloudflareContext().env as Record<string, unknown>;
  const binding = env.CONTACT_EMAIL as SendEmailBinding | undefined;
  if (!binding || typeof binding.send !== "function")
    throw new HttpError(503, "The contact form is unavailable right now. Please email us instead.");
  try {
    await binding.send(mail);
  } catch {
    logEvent("error", "contact_send_failed", { operation: "contact", code: "SEND_FAILED" });
    throw new HttpError(503, "Your message could not be sent. Please try again later.");
  }
}
