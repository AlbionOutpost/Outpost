/** The contact form's fields and outcomes, shared by the page (client) and the API (server). */
export const contactTopics = ["general", "bug", "privacy", "other"] as const;
export type ContactTopic = (typeof contactTopics)[number];
export const contactLimits = { name: 100, email: 254, message: 5000, minMessage: 10 } as const;
/** What the page says after a submission; the same codes come back as JSON and in the redirect. */
export const contactStatuses = ["sent", "invalid", "verification", "rate", "unavailable"] as const;
export type ContactStatus = (typeof contactStatuses)[number];
