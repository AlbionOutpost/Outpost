import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

test("journal progress survives reload, stays regional, filters completed entries and rejects forged backups", async ({
  page,
}) => {
  await page.goto("/guides/albion-journal-guide?region=europe");
  const first = page.locator('.journal-objectives input[type="checkbox"]').first();
  await expect(first).toBeEnabled();
  const name = await first.getAttribute("aria-label");
  await first.check();
  await expect(page.getByRole("status")).toHaveText("Progress saved on this device.");
  await page.reload();
  await expect(page.getByRole("checkbox", { name: name!, exact: true }).first()).toBeChecked();
  await page.getByLabel("Hide completed", { exact: true }).check();
  await expect(page.locator(".journal-objective.complete")).toHaveCount(0);
  await page.getByLabel("Hide completed", { exact: true }).uncheck();
  await page.getByRole("combobox", { name: "Albion region", exact: true }).click();
  await page.getByRole("option", { name: "Asia", exact: true }).click();
  await expect(first).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: name!, exact: true }).first()).not.toBeChecked();
  await page.getByRole("combobox", { name: "Albion region", exact: true }).click();
  await page.getByRole("option", { name: "Europe", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: name!, exact: true }).first()).toBeChecked();
  await page.getByText("Backup & restore progress", { exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export journal progress", exact: true }).click();
  const path = await (await downloaded).path();
  const backup = JSON.parse(readFileSync(path!, "utf8"));
  expect(backup.region).toBe("europe");
  expect(backup.completed).toHaveLength(1);
  for (const content of [
    { version: 1, region: "europe", completed: ["JOURNAL_FORGED"] },
    { ...backup, region: "asia" },
  ]) {
    await page.getByLabel("Import journal progress", { exact: true }).setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(content)),
    });
    await expect(page.getByRole("status")).toContainText(
      content.region === "asia" ? "another region" : "outside the recovered journal",
    );
    await expect(page.getByRole("checkbox", { name: name!, exact: true }).first()).toBeChecked();
  }
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByLabel("Import journal progress", { exact: true }).setInputFiles({
    name: "empty.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ version: 1, region: "europe", completed: [] })),
  });
  await expect(page.getByRole("checkbox", { name: name!, exact: true }).first()).toBeChecked();
  await page
    .getByRole("searchbox", { name: "Search objectives or rewards", exact: true })
    .fill("not-a-journal-objective");
  await expect(
    page.getByRole("heading", { name: "No objectives match.", exact: true }),
  ).toBeVisible();
});

test("fish accounting preserves manual zero and refresh overrides while excluding stale, missing and other-city prices", async ({
  page,
}) => {
  let stale = false;
  await page.route("**/api/market/batch?**", async (route) => {
    const url = new URL(route.request().url());
    const date = stale ? "2024-01-01T00:00:00Z" : new Date().toISOString();
    await route.fulfill({
      json: {
        region: url.searchParams.get("region"),
        source: "Albion Online Data Project",
        fetchedAt: new Date().toISOString(),
        prices: url.searchParams
          .get("items")!
          .split(",")
          .map((item_id) => ({
            item_id,
            city: "Fort Sterling",
            quality: 1,
            sell_price_min: item_id === "T1_FISHCHOPS" ? 60 : 100,
            sell_price_min_date: date,
            buy_price_max: item_id === "T1_FISHCHOPS" ? 50 : 120,
            buy_price_max_date: date,
            sell_price_max: 0,
            sell_price_max_date: "0001-01-01T00:00:00",
            buy_price_min: 0,
            buy_price_min_date: "0001-01-01T00:00:00",
          })),
      },
    });
  });
  await page.goto("/tools/fishing?region=europe");
  await page.getByLabel("Fish quantity", { exact: true }).fill("10");
  await page.getByLabel("Total sale fees (%)", { exact: true }).fill("10");
  await expect(page.locator('[data-result="fish-chop-profit"]')).toContainText("—");
  await page.getByRole("button", { name: "Refresh fish observations", exact: true }).click();
  await expect(page.getByLabel("Raw fish purchase price", { exact: true })).toHaveValue("100");
  await expect(page.locator('[data-result="fish-chop-profit"]')).toHaveText("350 silver");
  await page.getByLabel("Raw fish purchase price", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Refresh fish observations", exact: true }).click();
  await expect(page.getByLabel("Raw fish purchase price", { exact: true })).toHaveValue("0");
  await expect(page.locator('[data-result="fish-chop-profit"]')).toHaveText("1,350 silver");
  await page.getByLabel("Fishing market city", { exact: true }).selectOption("Lymhurst");
  await expect(page.getByLabel("Raw fish purchase price", { exact: true })).toHaveValue("");
  await expect(page.locator('[data-result="fish-chop-profit"]')).toContainText("—");
  await page.getByLabel("Fishing market city", { exact: true }).selectOption("Fort Sterling");
  await expect(page.getByLabel("Raw fish purchase price", { exact: true })).toHaveValue("0");
  stale = true;
  await page.getByRole("button", { name: "Refresh fish observations", exact: true }).click();
  await expect(page.getByLabel("Chopped fish sale price", { exact: true })).toHaveValue("");
  await expect(page.locator('[data-result="fish-chop-profit"]')).toContainText("—");
  await page.getByRole("combobox", { name: "Albion region", exact: true }).click();
  await page.getByRole("option", { name: "Asia", exact: true }).click();
  await expect(page.getByLabel("Raw fish purchase price", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Chopped fish sale price", { exact: true })).toHaveValue("");
});

test("fishing fame uses entered assumptions and whole-fish quantities", async ({ page }) => {
  await page.goto("/tools/fishing?mode=leveling");
  await page.getByLabel("Raw fish purchase price", { exact: true }).fill("1000");
  await page.getByLabel("Target fishing fame", { exact: true }).fill("10000");
  await page.getByLabel("Fame per consumed fish", { exact: true }).fill("210");
  await page.getByText("Price basis & extra costs", { exact: true }).click();
  await page.getByLabel("Purchase order fee (%)", { exact: true }).fill("2.5");
  await expect(page.locator('[data-result="fishing-fish-needed"]')).toHaveText("48");
  await expect(page.locator('[data-result="fishing-target-cost"]')).toHaveText("49,200 silver");
  await page.getByLabel("Fame per consumed fish", { exact: true }).fill("0");
  await expect(page.locator('[data-result="fishing-fish-needed"]')).toHaveText("—");
});

test("journal and fish workspaces reflow with usable controls at six widths", async ({ page }) => {
  for (const route of [
    "/guides/albion-journal-guide",
    "/tools/fishing",
    "/tools/fishing?mode=leveling",
    "/guides",
  ]) {
    await page.goto(route);
    for (const width of [320, 375, 390, 768, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}px`,
      ).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});
