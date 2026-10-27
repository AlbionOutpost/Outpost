import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile, mkdir } from "node:fs/promises";
test("light theme accessibility and anonymous sign in", async ({ page, context }) => {
  test.setTimeout(process.env.CI ? 180000 : 30000);
  const rows = [];
  await mkdir(".qa/screenshots", { recursive: true });
  for (const width of [375, 768, 1440, 1920]) {
    await context.addCookies([
      { name: "atlas-theme", value: "light", domain: "localhost", path: "/" },
    ]);
    for (const path of ["/", "/tools/market", "/tools/flipping", "/items", "/signin"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(path);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
        .analyze();
      await page.screenshot({
        path: `.qa/screenshots/light-${path.replaceAll("/", "_")}-${width}.png`,
        fullPage: true,
      });
      rows.push({
        width,
        path,
        violations: result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
      });
    }
  }
  await writeFile(".qa/light-audit.json", JSON.stringify(rows, null, 2));
  expect(rows.length).toBe(20);
  expect(rows.flatMap((r) => r.violations)).toEqual([]);
});
test("mobile drawer supports Escape and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close navigation", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
