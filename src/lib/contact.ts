import { z } from "zod";
import { contactLimits, contactTopics, type ContactTopic } from "./contact-fields";

/** The contact form (/contact → POST /api/contact): what it accepts and the mail it sends. */
export { contactLimits, contactTopics, type ContactTopic } from "./contact-fields";
/** The only mailbox the form writes to; the Cloudflare binding is locked to it as well. */
export const contactRecipient = "support@albionoutpost.com";
export const contactSender = {
  name: "Outpost Kontaktformular",
  email: "noreply@albionoutpost.com",
};

/** Per address: three in ten minutes and 20 a day; the whole form: 200 a day (the mailbox's guard). */
export const contactBudgets = {
  burst: { limit: 3, seconds: 600 },
  day: { limit: 20, seconds: 86400 },
  site: { limit: 200, seconds: 86400 },
} as const;

/**
 * A value that goes into a mail header (subject, names): no CR, LF or other control characters,
 * so nobody can add a header of their own (header injection), and no runs of spaces.
 */
export function headerSafe(value: string) {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The message body: Unix line breaks, no other control characters, at most two blank lines. */
function bodySafe(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export const contactInput = z.object({
  name: z.string().transform(headerSafe).pipe(z.string().min(1).max(contactLimits.name)),
  // Checked before any trimming of inner characters: an address carrying CR/LF is refused, not
  // repaired, because it ends up in the Reply-To header.
  email: z
    .string()
    .trim()
    .max(contactLimits.email)
    .refine((value) => !/[\s\u0000-\u001f\u007f<>"(),;:\\[\]]/.test(value), "Invalid email")
    .pipe(z.email()),
  topic: z.enum(contactTopics).default("general"),
  message: z
    .string()
    .transform(bodySafe)
    .pipe(z.string().min(contactLimits.minMessage).max(contactLimits.message)),
  lang: z.enum(["de", "en"]).default("en"),
});
export type ContactInput = z.infer<typeof contactInput>;

const topicNames: Record<ContactTopic, string> = {
  general: "Allgemein",
  bug: "Fehler",
  privacy: "Datenschutzanfrage",
  other: "Sonstiges",
};

export type ContactMail = {
  from: { name: string; email: string };
  to: string;
  replyTo: { name: string; email: string };
  subject: string;
  text: string;
};

/** The plain-text mail to the operator. The sender's address is only the Reply-To. */
export function contactMail(input: ContactInput, receivedAt = new Date()): ContactMail {
  const name = headerSafe(input.name).slice(0, contactLimits.name);
  const email = headerSafe(input.email);
  const topic = topicNames[input.topic];
  return {
    from: contactSender,
    to: contactRecipient,
    replyTo: { name, email },
    subject: headerSafe(`[Kontakt] ${topic} – ${name}`).slice(0, 160),
    text: [
      `Thema: ${topic}`,
      `Name: ${name}`,
      `E-Mail: ${email}`,
      `Sprache: ${input.lang}`,
      `Eingang: ${receivedAt.toISOString()}`,
      "",
      input.message,
      "",
      "-- ",
      "Gesendet über das Kontaktformular auf albionoutpost.com/contact. Antworten gehen an die oben genannte E-Mail-Adresse.",
    ].join("\n"),
  };
}
