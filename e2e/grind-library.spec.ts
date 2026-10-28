import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("recovered builds keep author, spells and swaps, and become independent validated guest drafts", async ({
  page,
}) => {
  await page.goto("/builds/library?q=Battleaxe+Mist+Build");
  await page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "Battleaxe Mist Build", exact: true }) })
    .first()
    .click();
  await expect(page.locator("h1")).toHaveText("Battleaxe Mist Build");
  await expect(page.locator(".intro")).toContainText("Arreat Regaro");
  await expect(page.getByLabel("Main hand recorded abilities")).toContainText("Blood Bandit");
  for (const name of [
    "Mistcaller",
    "Fiend Cowl",
    "Assassin Jacket",
    "Cleric Sandals",
    "Avalonian Cape",
    "Roasted Puremist Snapper",
    "Major Gigantify Potion",
  ]) {
    await expect(page.locator(".loadout-swaps").filter({ hasText: name })).toHaveCount(1);
  }
  await page.getByRole("link", { name: "Make this build yours", exact: true }).click();
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
    "Battleaxe Mist Build (copy)",
  );
  await expect(page.getByLabel("Main hand E", { exact: true })).toHaveValue("Blood Bandit");
  await page.getByRole("button", { name: "Save on this device", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Guest draft saved" })).toBeVisible();
  await page.goto("/builds/new");
  await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
    "Battleaxe Mist Build (copy)",
  );
  await page.getByRole("button", { name: "Choose alternative Helmet", exact: false }).click();
  await page.getByLabel("Search equipment", { exact: true }).fill("Scholar Cowl");
  await page.getByRole("button", { name: /^Equip Scholar Cowl/ }).click();
  await expect(
    page.getByRole("button", { name: "Choose alternative Helmet", exact: false }),
  ).toContainText("Scholar Cowl");
});
test("restored guides are readable documents and compositions retain every member position", async ({
  page,
}) => {
  await page.goto("/guides?q=fishing");
  await expect(page.locator(".grind-guide-card")).toHaveCount(1);
  await page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "Fishing Leveling Guide", exact: true }) })
    .click();
  await expect(page.locator("h1")).toHaveText("Fishing Leveling Guide");
  await expect(page.locator("article")).toContainText("Fisherman Mastery");
  expect(
    await page.locator("article script, article iframe, article input, article select").count(),
  ).toBe(0);
  await page.getByRole("link", { name: "Leveling Fishing in Albion Online", exact: true }).click();
  await expect(page).toHaveURL(/#section-leveling-fishing-in-albion-online$/);
  await page.goto("/compositions/library/dreamteam");
  await expect(page.locator(".library-comp-members > section")).toHaveCount(17);
  for (const width of [320, 375, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
test("loadout quotes use only recent selected-city observations and never total missing items as zero", async ({
  page,
}) => {
  let omit = false;
  await page.route("**/api/market/batch?**", async (route) => {
    const url = new URL(route.request().url());
    const items = url.searchParams.get("items")!.split(",");
    await route.fulfill({
      json: {
        region: url.searchParams.get("region"),
        source: "Albion Online Data Project",
        fetchedAt: new Date().toISOString(),
        prices: items.slice(omit ? 1 : 0).map((item_id) => ({
          item_id,
          city: "Fort Sterling",
          quality: Number(url.searchParams.get("quality")),
          sell_price_min: 100,
          sell_price_min_date: new Date().toISOString(),
          sell_price_max: 0,
          sell_price_max_date: "0001-01-01T00:00:00",
          buy_price_min: 0,
          buy_price_min_date: "0001-01-01T00:00:00",
          buy_price_max: 0,
          buy_price_max_date: "0001-01-01T00:00:00",
        })),
      },
    });
  });
  await page.goto("/builds/library/battleaxe-mist-build");
  await page.getByRole("button", { name: "Check loadout prices", exact: true }).click();
  await expect(page.locator(".loadout-price-total strong")).toHaveText("800 silver");
  await page.getByLabel("Loadout purchase city", { exact: true }).selectOption("Lymhurst");
  await expect(page.locator(".loadout-price-total strong")).toHaveText("Total unavailable");
  await page.getByLabel("Loadout purchase city", { exact: true }).selectOption("Fort Sterling");
  omit = true;
  await page.getByRole("button", { name: "Check loadout prices", exact: true }).click();
  await expect(page.locator(".loadout-price-total strong")).toHaveText("Total unavailable");
});
test("restored libraries, reading pages and consumable tools reflow at narrow widths", async ({
  page,
}) => {
  for (const route of [
    "/builds/library?q=Battleaxe",
    "/guides/fishing-leveling-guide",
    "/tools/cooking",
    "/tools/alchemy",
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
    await page.setViewportSize({ width: 320, height: 844 });
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await page.goto("/builds/new?from=battleaxe-mist-build");
  const toggle = page.getByRole("button", { name: "Show overview", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".studio-character-slots")).not.toBeVisible();
  await toggle.click();
  await expect(page.locator(".studio-character-slots")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Hide overview", exact: true }).click();
  await expect(page.locator(".studio-character-slots")).not.toBeVisible();
});
