import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  verifyTurnstile: vi.fn(),
  send: vi.fn(),
  context: vi.fn(),
}));
vi.mock("../src/lib/redis", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("../src/lib/turnstile", () => ({ verifyTurnstile: mocks.verifyTurnstile }));
vi.mock("../src/lib/contact-mailer", () => ({ sendContactMail: mocks.send }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.context }));

import { HttpError } from "../src/lib/http-error";
import { contactInput, contactMail, headerSafe } from "../src/lib/contact";
import { contactResponse } from "../src/lib/contact-request";
import { sendContactMail as sendOnCloudflare } from "../cloudflare/database/contact-mailer-web";

const origin = "https://albionoutpost.com";
const valid = {
  name: "Ada Lovelace",
  email: "ada@example.org",
  topic: "bug",
  message: "The flipping table shows the wrong city for Caerleon.",
  lang: "de",
  "cf-turnstile-response": "token",
};
function post(
  fields: Record<string, string> = valid,
  { json = true, headers = {} }: { json?: boolean; headers?: Record<string, string> } = {},
) {
  return new Request(`${origin}/api/contact`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(json ? { Accept: "application/json" } : {}),
      ...headers,
    },
    body: new URLSearchParams(fields),
  });
}

beforeEach(() => {
  vi.stubEnv("NEXTAUTH_URL", origin);
  mocks.rateLimit.mockResolvedValue(true);
  mocks.verifyTurnstile.mockResolvedValue(undefined);
  mocks.send.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("contact input", () => {
  it("accepts a complete message and defaults the topic", () => {
    const input = contactInput.parse({ ...valid, topic: undefined });
    expect(input.topic).toBe("general");
    expect(input.lang).toBe("de");
  });
  it.each([
    ["an empty name", { name: "   " }],
    ["a malformed email", { email: "not-an-email" }],
    ["an email carrying a header", { email: "ada@example.org\r\nBcc: victim@example.org" }],
    ["an email with spaces", { email: "ada @example.org" }],
    ["a message under 10 characters", { message: "Hi there" }],
    ["a message over 5,000 characters", { message: "x".repeat(5001) }],
    ["an unknown topic", { topic: "sales" }],
  ])("refuses %s", (_label, change) => {
    expect(contactInput.safeParse({ ...valid, ...change }).success).toBe(false);
  });
});

describe("header injection", () => {
  it("strips CR, LF and other control characters from header values", () => {
    expect(headerSafe("Eve\r\nBcc: victim@example.org")).toBe("Eve Bcc: victim@example.org");
    expect(headerSafe("A\u0000B\u2028C\tD")).toBe("A B C D");
  });
  it("a name with line breaks cannot add a header to the mail", () => {
    const input = contactInput.parse({ ...valid, name: "Eve\r\nBcc: victim@example.org" });
    const mail = contactMail(input, new Date("2026-11-11T12:00:00Z"));
    expect(mail.subject).toBe("[Kontakt] Fehler – Eve Bcc: victim@example.org");
    for (const value of [mail.subject, mail.replyTo.name, mail.replyTo.email])
      expect(value).not.toMatch(/[\r\n]/);
    expect(mail.to).toBe("support@albionoutpost.com");
    expect(mail.from).toEqual({
      name: "Outpost Kontaktformular",
      email: "noreply@albionoutpost.com",
    });
    expect(mail.replyTo.email).toBe("ada@example.org");
    expect(mail.text).toContain("Thema: Fehler");
    expect(mail.text).toContain(valid.message);
  });
  it("keeps the message's own line breaks as Unix newlines", () => {
    const input = contactInput.parse({ ...valid, message: "Line one\r\nLine two\rLine three" });
    expect(input.message).toBe("Line one\nLine two\nLine three");
  });
});

describe("POST /api/contact", () => {
  it("sends one mail and answers without echoing the message", async () => {
    const response = await contactResponse(post());
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ ok: true });
    expect(body).not.toContain("Caerleon");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith("token", "contact");
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0][0].replyTo.email).toBe("ada@example.org");
  });

  it("a form post without JavaScript is redirected to the result in its language", async () => {
    const response = await contactResponse(post(valid, { json: false }));
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(`${origin}/contact?lang=de&status=sent`);
    const failed = await contactResponse(post({ ...valid, message: "short" }, { json: false }));
    expect(failed.status).toBe(303);
    expect(failed.headers.get("Location")).toBe(`${origin}/contact?lang=de&status=invalid`);
    expect(failed.headers.get("Location")).not.toContain("short");
  });

  it("refuses another origin before reading anything", async () => {
    const response = await contactResponse(
      post(valid, { headers: { Origin: "https://evil.example" } }),
    );
    expect(response.status).toBe(403);
    expect(mocks.rateLimit).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("refuses JSON or multipart bodies and invalid input", async () => {
    const wrongType = await contactResponse(
      post(valid, { headers: { "Content-Type": "application/json" } }),
    );
    expect(wrongType.status).toBe(415);
    expect(await wrongType.json()).toEqual({ error: "invalid" });
    const invalid = await contactResponse(post({ ...valid, email: "nope" }));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "invalid" });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("stops at the rate limit without verifying or sending", async () => {
    mocks.rateLimit.mockResolvedValue(false);
    const response = await contactResponse(post());
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate" });
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("counts per address on Cloudflare: 3 in 10 minutes, 20 a day, 200 a day site-wide", async () => {
    vi.stubEnv("OUTPOST_RUNTIME", "cloudflare");
    await contactResponse(post(valid, { headers: { "cf-connecting-ip": "203.0.113.9" } }));
    expect(mocks.rateLimit.mock.calls).toEqual([
      ["contact:203.0.113.9", 3, 600],
      ["contact-day:203.0.113.9", 20, 86400],
      ["contact-site", 200, 86400],
    ]);
  });

  it("ignores a forged address header outside Cloudflare", async () => {
    await contactResponse(post(valid, { headers: { "cf-connecting-ip": "203.0.113.9" } }));
    expect(mocks.rateLimit.mock.calls).toEqual([["contact-site", 200, 86400]]);
  });

  it("a failed or missing Turnstile check sends nothing", async () => {
    mocks.verifyTurnstile.mockRejectedValue(
      new HttpError(403, "Bot verification expired or failed. Please try again."),
    );
    const response = await contactResponse(post());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "verification" });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("an unavailable mailer is reported, not hidden", async () => {
    mocks.send.mockRejectedValue(new HttpError(503, "unavailable"));
    const response = await contactResponse(post());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "unavailable" });
  });
});

describe("Cloudflare mailer", () => {
  const mail = contactMail(contactInput.parse(valid));
  it("without the CONTACT_EMAIL binding it refuses with 503 instead of pretending", async () => {
    mocks.context.mockReturnValue({ env: {} });
    await expect(sendOnCloudflare(mail)).rejects.toMatchObject({ status: 503 });
  });
  it("sends the plain-text mail through the binding", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "m1" });
    mocks.context.mockReturnValue({ env: { CONTACT_EMAIL: { send } } });
    await sendOnCloudflare(mail);
    expect(send).toHaveBeenCalledWith(mail);
    expect(send.mock.calls[0][0]).toMatchObject({
      to: "support@albionoutpost.com",
      from: { email: "noreply@albionoutpost.com" },
    });
  });
  it("a binding error becomes a 503", async () => {
    mocks.context.mockReturnValue({
      env: {
        CONTACT_EMAIL: { send: vi.fn().mockRejectedValue(new Error("destination unverified")) },
      },
    });
    await expect(sendOnCloudflare(mail)).rejects.toMatchObject({ status: 503 });
  });
});
