import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { legalPublished } from "../src/lib/legal";

// The contact form is the Impressum's second contact channel and goes live with /legal.
test.skip(!legalPublished, "Contact form ships with the legal page (src/lib/legal.ts)");

// The Node dev server has no Turnstile keys and no mail binding: src/lib/contact-mailer.ts logs a
// redacted "would send" line instead of mailing, so the send is mocked by the runtime itself.
test("the contact form sends in place, keeps nothing on the page and states the result", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/contact?lang=de");
  const main = page.locator('main div[lang="de"]');
  await expect(main.getByRole("heading", { level: 1 })).toContainText("Kontakt");
  await expect(main.getByRole("link", { name: "Datenschutzerklärung" })).toHaveAttribute(
    "href",
    "/legal?lang=de#privacy",
  );
  await main.getByRole("textbox", { name: "Name", exact: true }).fill("Ada Lovelace");
  await main.getByRole("textbox", { name: "E-Mail-Adresse", exact: true }).fill("ada@example.org");
  await main.getByRole("combobox", { name: "Thema", exact: true }).selectOption("bug");
  await main
    .getByRole("textbox", { name: "Nachricht", exact: true })
    .fill("The flipping table shows the wrong city for Caerleon.");
  const sent = page.waitForResponse(
    (response) => response.url().endsWith("/api/contact") && response.request().method() === "POST",
  );
  await main.getByRole("button", { name: "Nachricht senden" }).click();
  const response = await sent;
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
  await expect(main.getByRole("status")).toContainText("Ihre Nachricht ist angekommen");
  await expect(main).not.toContainText("Caerleon");
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
});

// Pages stream behind their loading boundary, so a browser without JavaScript cannot render the
// form itself; the endpoint still answers a plain form post the way a browser submits it.
test("a plain form post is redirected to the result page in its language", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/contact", {
    headers: { Origin: "http://localhost:3000" },
    form: {
      name: "Ada Lovelace",
      email: "ada@example.org",
      topic: "general",
      message: "A message sent as a plain form post.",
      lang: "en",
    },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  expect(response.headers()["location"]).toMatch(/\/contact\?lang=en&status=sent$/);
  await page.goto("/contact?lang=en&status=sent");
  await expect(page.locator('main div[lang="en"]').getByRole("status")).toContainText(
    "your message has arrived",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("the API refuses another origin and a short message without sending", async ({ request }) => {
  const form = {
    name: "Ada",
    email: "ada@example.org",
    message: "A message long enough to pass.",
    lang: "en",
  };
  const foreign = await request.post("/api/contact", {
    headers: { Origin: "https://evil.example", Accept: "application/json" },
    form,
  });
  expect(foreign.status()).toBe(403);
  const short = await request.post("/api/contact", {
    headers: { Origin: "http://localhost:3000", Accept: "application/json" },
    form: { ...form, message: "short" },
  });
  expect(short.status()).toBe(400);
  expect(await short.json()).toEqual({ error: "invalid" });
});

test("the footer links the Impressum, privacy policy and contact form", async ({ page }) => {
  await page.goto("/tools");
  const footer = page.locator("footer.site-footer");
  await expect(footer.locator('a[href="/legal"]')).toHaveCount(1);
  await expect(footer.locator('a[href="/legal#privacy"]')).toHaveCount(1);
  await expect(footer.locator('a[href="/contact"]')).toHaveCount(1);
});
