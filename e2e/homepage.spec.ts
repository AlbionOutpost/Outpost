import { test, expect } from "@playwright/test";

test("landing page leads with benefits, a real product demo, provenance and a final call to action", async ({
  page,
}) => {
  let marketCalls = 0;
  await page.route("**/api/market?*", (route) => {
    marketCalls++;
    return route.fulfill({ json: { region: "europe", prices: [] } });
  });
  await page.goto("/?region=europe");
  await expect(page.locator("h1")).toHaveText("Your Albionadvantage.");
  // The page is static: no market request is made on arrival.
  expect(marketCalls).toBe(0);
  const benefits = page.locator(".reference-feature-grid > article");
  await expect(benefits).toHaveCount(3);
  await expect(benefits.nth(0)).toContainText("Know the price before you travel");
  await expect(benefits.nth(1)).toContainText(/\d{1,3}(,\d{3})+ library builds/);
  await expect(benefits.nth(2)).toContainText(/\d+ calculators/);
  const demo = page.getByRole("region", { name: "The Market Explorer, as it runs today" });
  const screenshot = demo.locator("img").first();
  await expect(screenshot).toHaveAttribute("src", /\/home\/market-explorer\.webp/);
  await screenshot.scrollIntoViewIfNeeded();
  await screenshot.evaluate((node: HTMLImageElement) => node.decode());
  expect(await screenshot.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(
    0,
  );
  await expect(demo).toContainText("Screenshot of albionoutpost.com");
  await expect(page.locator(".home-library-picks .library-build-card")).toHaveCount(4);
  const trust = page.getByRole("region", { name: "Where the numbers come from" });
  await expect(trust).toContainText("Albion Online Data Project");
  await expect(trust).toContainText(/captured \d{1,2} \w{3} \d{4}/);
  const cta = page.getByRole("region", { name: "Make your next move count." });
  await expect(cta.getByRole("link", { name: /Explore Market/ })).toHaveAttribute(
    "href",
    "/tools/market?region=europe",
  );
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
