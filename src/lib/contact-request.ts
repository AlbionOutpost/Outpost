import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError } from "./http-error";
import { readBoundedText } from "./request-body";
import { rateLimit } from "./redis";
import { addressBucket } from "./client-address";
import { verifyTurnstile } from "./turnstile";
import { logEvent } from "./logging";
import { contactBudgets, contactInput, contactMail } from "./contact";
import { sendContactMail } from "./contact-mailer";
import type { ContactStatus } from "./contact-fields";

/** Only Cloudflare's overwritten address header is trusted; Node keeps the site-wide budget. */
function clientKey(request: Request) {
  const ip =
    process.env.OUTPOST_RUNTIME === "cloudflare" && request.headers.get("cf-connecting-ip");
  return ip && /^[0-9a-f:.]{3,45}$/i.test(ip) ? addressBucket(ip) : null;
}

async function within(key: string, budget: { limit: number; seconds: number }) {
  return rateLimit(key, budget.limit, budget.seconds);
}

/**
 * One contact message: same origin, a bounded form body, validation, the address and site
 * budgets, Turnstile, then one mail to the operator. Nothing is stored and nothing echoed back.
 */
export async function submitContact(request: Request, form: URLSearchParams) {
  const input = contactInput.parse({
    name: form.get("name") ?? "",
    email: form.get("email") ?? "",
    topic: form.get("topic") || undefined,
    message: form.get("message") ?? "",
    lang: form.get("lang") || undefined,
  });
  const client = clientKey(request);
  if (
    (client &&
      (!(await within(`contact:${client}`, contactBudgets.burst)) ||
        !(await within(`contact-day:${client}`, contactBudgets.day)))) ||
    !(await within("contact-site", contactBudgets.site))
  )
    throw new HttpError(429, "Too many messages. Please try again later.");
  await verifyTurnstile(form.get("cf-turnstile-response"), "contact");
  await sendContactMail(contactMail(input));
  logEvent("info", "contact_sent", { operation: "contact" });
}

async function readForm(request: Request) {
  const expected = new URL(process.env.NEXTAUTH_URL || request.url).origin;
  if (request.headers.get("origin") !== expected)
    throw new HttpError(403, "Invalid request origin");
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded"))
    throw new HttpError(415, "Form content type required");
  // 5,000 characters of any script, percent-encoded, fit with room to spare.
  return new URLSearchParams(await readBoundedText(request, 65536));
}

function statusOf(error: unknown): { status: number; code: ContactStatus } {
  if (error instanceof z.ZodError) return { status: 400, code: "invalid" };
  if (error instanceof HttpError) {
    if (error.status === 429) return { status: 429, code: "rate" };
    if (error.status === 403) return { status: 403, code: "verification" };
    if (error.status < 500) return { status: error.status, code: "invalid" };
    return { status: error.status, code: "unavailable" };
  }
  logEvent("error", "api_failure", { operation: "contact.send", code: "SERVICE_UNAVAILABLE" });
  return { status: 503, code: "unavailable" };
}

/**
 * POST /api/contact. The page's script asks for JSON; a plain form post (no JavaScript) gets a
 * 303 back to /contact with the outcome in the query, so the form works either way.
 */
export async function contactResponse(request: Request) {
  const json = (request.headers.get("accept") ?? "").includes("application/json");
  let lang: "de" | "en" = "en";
  let result: { status: number; code: ContactStatus };
  try {
    const form = await readForm(request);
    lang = form.get("lang") === "de" ? "de" : "en";
    await submitContact(request, form);
    result = { status: 200, code: "sent" };
  } catch (error) {
    result = statusOf(error);
  }
  const headers = { "Cache-Control": "private, no-store" };
  if (json)
    return NextResponse.json(result.code === "sent" ? { ok: true } : { error: result.code }, {
      status: result.status,
      headers,
    });
  const target = new URL(
    `/contact?lang=${lang}&status=${result.code}`,
    process.env.NEXTAUTH_URL || request.url,
  );
  return NextResponse.redirect(target, { status: 303, headers });
}
