import { logEvent } from "./logging";
import type { ContactMail } from "./contact";

/**
 * Node runtime (local development and the standalone build): nothing is sent. One redacted line
 * says a message would have gone out; the sender, subject and message are never logged.
 * Cloudflare builds replace this module with `cloudflare/database/contact-mailer-web.ts`, which
 * sends through the web Worker's `CONTACT_EMAIL` binding.
 */
export async function sendContactMail(mail: ContactMail): Promise<void> {
  void mail;
  logEvent("info", "contact_would_send", { operation: "contact", code: "LOCAL_NOT_SENT" });
}
