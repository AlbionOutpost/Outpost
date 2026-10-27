import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("homepage presents one functional preview and compact task navigation at review widths", async ({
  page,
}) => {
  await mkdir(".qa/ux-transform/regression", { recursive: true });
  await page.route("**/api/market?*", (route) =>
    route.fulfill({ json: { region: "europe", prices: [] } }),
  );
  await page.route("**/api/history?*", (route) =>
    route.fulfill({ json: { region: "europe", data: [] } }),
  );
  for (const width of [1440, 1920, 768, 390, 375, 320]) {
    await page.setViewportSize({
      width,
      height: width === 1920 ? 1080 : width === 1440 ? 900 : width === 768 ? 1024 : 844,
    });
    await page.goto("/?region=europe");
    await expect(page.locator(".home-task-list a")).toHaveCount(3);
    await expect(page.locator(".home-terminal")).toHaveCount(1);
    await expect(
      page.locator(".equipment-showcase,.home-market-pulse,.market-desk,.home-community-builds"),
    ).toHaveCount(0);
    const tasks = page.getByRole("navigation", { name: "Start a task" });
    await expect(tasks.getByRole("link", { name: /Create a build/ })).toHaveAttribute(
      "href",
      "/builds/new?region=europe",
    );
    await expect(tasks.getByRole("link", { name: /Price a crafting run/ })).toHaveAttribute(
      "href",
      "/tools/crafting?region=europe",
    );
    await expect(tasks.getByRole("link", { name: /Plan your comp/ })).toHaveAttribute(
      "href",
      "/compositions?region=europe",
    );
    if (width <= 780) {
      await expect(tasks).toBeInViewport();
      await expect(page.locator(".terminal-data-grid")).not.toBeVisible();
      await page.getByRole("button", { name: "Show city prices & history", exact: true }).click();
      await expect(page.locator(".terminal-data-grid")).toBeVisible();
      await page.getByRole("button", { name: "Hide price preview", exact: true }).click();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.screenshot({
      path: `.qa/ux-transform/regression/home-${width}.png`,
      fullPage: true,
    });
  }
});
