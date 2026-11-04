import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("German legal draft keeps operator gaps, legacy anchors and usable rights routes visible", async ({
  page,
}) => {
  await page.goto("/legal?region=europe");
  const legal = page.locator('main [lang="de"]');
  await expect(legal.getByRole("heading", { level: 1 })).toHaveText("Rechtliches bei Outpost.");
  await expect(legal.getByRole("note", { name: "Vorläufiger Dokumentstatus" })).toContainText(
    "Entwurf",
  );
  await expect(legal.locator("#operator")).toContainText("Register");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  for (const id of ["operator", "data-sources", "scene-artwork", "media", "privacy"])
    await expect(legal.locator(`#${id}`)).toHaveCount(1);
  const contents = legal.getByRole("navigation", { name: "Rechtliche Themen" });
  const links = contents.getByRole("link");
  await expect(links).toHaveCount(12);
  for (const link of await links.all()) {
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
  await expect(legal.locator("#scene-artwork")).not.toContainText("archived");
});

test("German legal reading layout and cookie table stay accessible in both themes on phones and desktop", async ({
  page,
  context,
}) => {
  for (const theme of ["dark", "light"]) {
    await context.addCookies([
      { name: "atlas-theme", value: theme, domain: "localhost", path: "/" },
    ]);
    await page.goto("/legal");
    const legal = page.locator('main [lang="de"]');
    await expect(legal).toBeVisible();
    for (const width of [1920, 1440, 768, 390, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const table = legal.getByRole("region", { name: "Cookies und lokale Speicherfunktionen" });
      await table.scrollIntoViewIfNeeded();
      await table.focus();
      const overflow = await table.evaluate((node) => node.scrollWidth - node.clientWidth);
      if (overflow > 1) {
        await table.press("ArrowRight", { delay: 100 });
        await expect.poll(() => table.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
      }
    }
    const analysis = await new AxeBuilder({ page }).include('main [lang="de"]').analyze();
    expect(analysis.violations).toEqual([]);
  }
});
