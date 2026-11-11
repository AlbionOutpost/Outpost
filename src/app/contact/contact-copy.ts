import type { LegalLocale } from "@/lib/legal-language";
import type { ContactStatus, ContactTopic } from "@/lib/contact-fields";

export type ContactCopy = {
  title: string;
  accent: string;
  description: string;
  formTitle: string;
  lead: string;
  name: string;
  email: string;
  emailHint: string;
  topic: string;
  topics: Record<ContactTopic, string>;
  message: string;
  messageHint: (count: number, max: number) => string;
  send: string;
  sending: string;
  verifying: string;
  verification: string;
  verificationUnavailable: string;
  privacy: [string, string, string];
  status: Record<ContactStatus, string>;
  another: string;
  railEmailTitle: string;
  railEmail: string;
  railNoticeTitle: string;
  railNotice: string;
  railNoticeLink: string;
};

/** The contact page in German and English, like /legal. */
export function contactCopy(locale: LegalLocale): ContactCopy {
  return locale === "de"
    ? {
        title: "Kontakt zu Outpost",
        accent: "Kontakt",
        description:
          "Fragen, Fehler, Datenschutzanfragen: schreiben Sie uns, wir antworten per E-Mail.",
        formTitle: "Nachricht senden",
        lead: "Alle Felder außer dem Thema sind Pflichtfelder.",
        name: "Name",
        email: "E-Mail-Adresse",
        emailHint: "Wir antworten an diese Adresse.",
        topic: "Thema",
        topics: {
          general: "Allgemeine Frage",
          bug: "Fehler melden",
          privacy: "Datenschutzanfrage",
          other: "Sonstiges",
        },
        message: "Nachricht",
        messageHint: (count, max) =>
          `${count.toLocaleString("de-DE")} von ${max.toLocaleString("de-DE")} Zeichen, mindestens 10.`,
        send: "Nachricht senden",
        sending: "Wird gesendet …",
        verifying: "Prüfung läuft …",
        verification: "Bot-Prüfung",
        verificationUnavailable:
          "Die Bot-Prüfung konnte nicht geladen werden. Bitte laden Sie die Seite neu oder schreiben Sie uns eine E-Mail.",
        privacy: [
          "Wir verwenden Ihre Angaben nur, um Ihre Anfrage zu beantworten. Mehr dazu in der ",
          "Datenschutzerklärung",
          ".",
        ],
        status: {
          sent: "Danke, Ihre Nachricht ist angekommen. Wir antworten an die angegebene E-Mail-Adresse.",
          invalid:
            "Bitte prüfen Sie Name, E-Mail-Adresse und Nachricht (mindestens 10, höchstens 5.000 Zeichen).",
          verification:
            "Die Bot-Prüfung ist abgelaufen oder fehlgeschlagen. Bitte versuchen Sie es noch einmal.",
          rate: "Zu viele Nachrichten in kurzer Zeit. Bitte versuchen Sie es später noch einmal oder schreiben Sie uns eine E-Mail.",
          unavailable:
            "Die Nachricht konnte gerade nicht gesendet werden. Bitte versuchen Sie es später noch einmal oder schreiben Sie uns eine E-Mail.",
        },
        another: "Weitere Nachricht schreiben",
        railEmailTitle: "Lieber per E-Mail?",
        railEmail: "Sie erreichen uns auch direkt unter",
        railNoticeTitle: "Anbieter",
        railNotice: "Wer Outpost betreibt und wie wir Daten verarbeiten, steht im",
        railNoticeLink: "Impressum",
      }
    : {
        title: "Contact Outpost",
        accent: "Contact",
        description: "Questions, bugs, privacy requests: write to us and we reply by email.",
        formTitle: "Send a message",
        lead: "Every field except the topic is required.",
        name: "Name",
        email: "Email address",
        emailHint: "We reply to this address.",
        topic: "Topic",
        topics: {
          general: "General question",
          bug: "Report a bug",
          privacy: "Privacy request",
          other: "Something else",
        },
        message: "Message",
        messageHint: (count, max) =>
          `${count.toLocaleString("en-GB")} of ${max.toLocaleString("en-GB")} characters, at least 10.`,
        send: "Send message",
        sending: "Sending …",
        verifying: "Verifying …",
        verification: "Bot verification",
        verificationUnavailable:
          "The bot check could not load. Please reload the page or email us instead.",
        privacy: [
          "We use your details only to answer your request. More in the ",
          "privacy policy",
          ".",
        ],
        status: {
          sent: "Thanks, your message has arrived. We will reply to the email address you gave.",
          invalid:
            "Please check your name, email address and message (at least 10 and at most 5,000 characters).",
          verification: "The bot check expired or failed. Please try again.",
          rate: "Too many messages in a short time. Please try again later or email us instead.",
          unavailable:
            "Your message could not be sent just now. Please try again later or email us instead.",
        },
        another: "Write another message",
        railEmailTitle: "Prefer email?",
        railEmail: "You can also reach us directly at",
        railNoticeTitle: "Who runs Outpost",
        railNotice: "The operator and how we handle data are in the",
        railNoticeLink: "legal notice",
      };
}
