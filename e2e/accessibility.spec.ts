import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** WCAG 2.2 AA scan of the main public pages. Serious and critical findings fail the run. */
const pages = [
  "/",
  "/tools",
  "/tools/market",
  "/tools/crafting",
  "/tools/refining",
  "/builds",
  "/builds/library",
  "/builds/library/battleaxe-mist-build",
  "/compositions",
  "/guides",
  "/guides/albion-journal-guide",
  "/items",
  "/market-data",
  "/signin",
];
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
];
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const viewport of viewports) {
  test.describe(`axe at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    for (const path of pages) {
      test(`${path} has no serious or critical violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator("h1").first()).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
        const blocking = violations.filter((v) => ["serious", "critical"].includes(v.impact || ""));
        expect(
          blocking.map((v) => ({
            id: v.id,
            impact: v.impact,
            targets: v.nodes.slice(0, 4).map((n) => n.target.join(" ")),
          })),
        ).toEqual([]);
      });
    }
  });
}

test("every public page has a single h1 and one main landmark", async ({ page }) => {
  for (const path of pages) {
    await page.goto(path);
    await expect(page.locator("h1:visible"), `${path} h1`).toHaveCount(1);
    expect(await page.locator("main, [role=main]").count(), `${path} main`).toBe(1);
  }
});
