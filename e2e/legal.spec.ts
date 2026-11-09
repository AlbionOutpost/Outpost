import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { legalPublished } from "../src/lib/legal";

// The page is unpublished until the operator details are final; these run again once it is on.
test.skip(!legalPublished, "Legal pages are unpublished (src/lib/legal.ts)");

const copies = {
  en: {
    title: "Legal information at Outpost",
    topics: "Legal topics",
    contents: "On this page",
    cookies: "Cookies and local storage features",
  },
  de: {
    title: "Rechtliches bei Outpost",
    topics: "Rechtliche Themen",
    contents: "Auf dieser Seite",
    cookies: "Cookies und lokale Speicherfunktionen",
  },
} as const;

test("German legal draft keeps operator gaps, legacy anchors and usable rights routes visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/legal?lang=de&region=europe");
  const legal = page.locator('main div[lang="de"]');
  await expect(legal.getByRole("heading", { level: 1 })).toHaveText(copies.de.title);
  await expect(legal.getByRole("note")).toContainText("Entwurf");
  await legal.getByRole("note").locator("summary").click();
  await expect(legal.getByRole("note")).toContainText("keine rechtliche Konformität");
  await expect(legal.locator("#operator")).toContainText("Register");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  for (const id of ["operator", "data-sources", "scene-artwork", "media", "privacy"])
    await expect(legal.locator(`#${id}`)).toHaveCount(1);
  const contents = legal.getByRole("navigation", { name: copies.de.topics });
  await expect(contents.getByRole("link")).toHaveCount(14);
  for (const link of await contents.getByRole("link").all()) {
    const target = await link.getAttribute("href");
    expect(target).toMatch(/^#[a-z-]+$/);
    await expect(legal.locator(target!)).toHaveCount(1);
  }
  await contents.getByRole("link", { name: "Ihre Datenschutzrechte", exact: true }).click();
  await expect(page).toHaveURL(/#rights$/);
  await expect(
    legal.getByRole("heading", { name: "Ihre Datenschutzrechte", exact: true }),
  ).toBeInViewport();
  await expect(legal.locator('#retention a[href="/settings#account-data"]')).toBeVisible();
  await expect(legal.locator('#retention a[href="/settings#account-delete"]')).toBeVisible();
  await expect(legal.locator("#withdrawal")).toContainText("§ 356a BGB");
  await expect(legal.locator("#scene-artwork")).toContainText("Ein Teil");
});

test("legal language follows the browser and explicit choice without external translation or cookies", async ({
  browser,
}) => {
  const external: string[] = [];
  for (const [preference, locale] of [
    ["en-GB", "en"],
    ["de-DE", "de"],
    ["fr-FR", "en"],
  ] as const) {
    const context = await browser.newContext({ locale: preference });
    try {
      const page = await context.newPage();
      page.on("request", (request) => {
        if (new URL(request.url()).hostname !== "localhost") external.push(request.url());
      });
      const navigation = page.waitForRequest((request) => request.isNavigationRequest());
      await page.goto("http://localhost:3000/legal?region=asia");
      expect((await navigation).headers()["accept-language"]).toContain(preference);
      await expect(page.locator(`main div[lang="${locale}"] h1`)).toHaveText(copies[locale].title);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    } finally {
      await context.close();
    }
  }
  const context = await browser.newContext({ locale: "de-DE" });
  try {
    const page = await context.newPage();
    page.on("request", (request) => {
      if (new URL(request.url()).hostname !== "localhost") external.push(request.url());
    });
    await page.goto("http://localhost:3000/legal?lang=en&region=asia#privacy");
    const beforeCookies = (await context.cookies()).map((cookie) => cookie.name).sort();
    const language = page.getByRole("navigation", { name: "Language", exact: true });
    await expect(language.getByRole("link", { name: "English", exact: true })).toHaveAttribute(
      "aria-current",
      "true",
    );
    const german = language.getByRole("link", { name: "Deutsch", exact: true });
    await expect(german).toHaveAttribute("href", "/legal?lang=de&region=asia");
    await german.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/legal\?lang=de&region=asia#privacy$/);
    await expect(page.locator('main div[lang="de"] #privacy')).toBeInViewport();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page
      .getByRole("navigation", { name: "Sprache", exact: true })
      .getByRole("link", { name: "English", exact: true })
      .click();
    await expect(page).toHaveURL(/\/legal\?lang=en&region=asia#privacy$/);
    await page.reload();
    await expect(page.locator('main div[lang="en"] h1')).toHaveText(copies.en.title);
    expect((await context.cookies()).map((cookie) => cookie.name).sort()).toEqual(beforeCookies);
    expect(external).toEqual([]);
  } finally {
    await context.close();
  }
});

test("cold legal links reach their section after delayed font layout", async ({ browser }) => {
  for (const locale of ["en", "de"] as const) {
    const context = await browser.newContext({ locale: locale === "de" ? "de-DE" : "en-GB" });
    try {
      const page = await context.newPage();
      await page.route("**/*.woff2", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 650));
        await route.continue();
      });
      await page.goto(`http://localhost:3000/legal?lang=${locale}#privacy`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(`main div[lang="${locale}"] #privacy`)).toBeInViewport();
      await page.reload();
      await expect(page.locator(`main div[lang="${locale}"] #privacy`)).toBeInViewport();
    } finally {
      await context.close();
    }
  }
});

test("both legal languages retain responsive reading, keyboard contents and cookie table access", async ({
  page,
  context,
}) => {
  await mkdir(".qa/legal-language/regression", { recursive: true });
  for (const locale of ["en", "de"] as const) {
    for (const theme of ["dark", "light"]) {
      await context.addCookies([
        { name: "atlas-theme", value: theme, domain: "localhost", path: "/" },
      ]);
      await page.goto(`/legal?lang=${locale}&region=europe`);
      const legal = page.locator(`main div[lang="${locale}"]`);
      await expect(legal).toBeVisible();
      for (const width of [1920, 1440, 768, 390, 375, 320]) {
        await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => scrollTo(0, 0));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (width < 851) {
          const disclosure = legal
            .locator("details")
            .filter({
              has: page.getByRole("navigation", {
                name: copies[locale].topics,
                includeHidden: true,
              }),
            })
            .first();
          await expect(disclosure).not.toHaveAttribute("open");
          await disclosure.locator("summary").focus();
          await page.keyboard.press("Enter");
          await expect(disclosure).toHaveAttribute("open", "");
          await disclosure.locator('a[href="#rights"]').click();
          await expect(page).toHaveURL(/#rights$/);
          await disclosure.locator("summary").click();
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: `.qa/legal-language/regression/${locale}-${theme}-${width}.png`,
        });
        const table = legal.getByRole("region", { name: copies[locale].cookies, exact: true });
        await table.scrollIntoViewIfNeeded();
        await table.focus();
        await table.evaluate((node) => {
          node.scrollLeft = 0;
        });
        if (await table.evaluate((node) => node.scrollWidth - node.clientWidth > 1)) {
          await table.press("ArrowRight", { delay: 100 });
          await expect.poll(() => table.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
          await table.evaluate((node) => {
            node.scrollLeft = node.scrollWidth;
          });
          expect(
            await table.evaluate(
              (node) =>
                node.querySelector("th:last-child")!.getBoundingClientRect().right <=
                node.getBoundingClientRect().right + 1,
            ),
          ).toBe(true);
        }
      }
      expect(
        (await new AxeBuilder({ page }).include(`main div[lang="${locale}"]`).analyze()).violations,
      ).toEqual([]);
    }
  }
});
