import { test, expect } from "@playwright/test";

test("landing page leads with the painted hero, tool and build tiles and the players band", async ({
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
  const benefits = page.getByRole("list", { name: "What Outpost does" }).getByRole("listitem");
  await expect(benefits).toHaveCount(3);
  await expect(benefits.nth(0)).toContainText("Market data");
  const tiles = page.locator(".landing-tool-tile");
  await expect(tiles).toHaveCount(6);
  await expect(tiles.first()).toHaveAttribute("href", "/tools/market?region=europe");
  await expect(tiles.first()).toContainText("Market Explorer");
  const builds = page.locator(".landing-build-tile");
  await expect(builds).toHaveCount(6);
  await expect(builds.first()).toHaveAttribute(
    "href",
    /\/builds\/library\/[a-z0-9-]+\?region=europe/,
  );
  await expect(builds.first().locator(".landing-chip").first()).not.toBeEmpty();
  const band = page.getByRole("region", { name: "Built for Albion players" });
  await expect(band).toContainText("Albion Online Data Project");
  await expect(band).toContainText(/captured \d{1,2} \w{3} \d{4}/);
  await expect(band.getByRole("link", { name: /Explore Market/ })).toHaveAttribute(
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

test("robots points crawlers at a sitemap of public pages and keeps editors out", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /builds/new");
  expect(robots).toMatch(/Sitemap: https?:\/\/[^/]+\/sitemap\.xml/);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/builds/library/battleaxe-mist-build</loc>");
  expect(sitemap).toContain("/tools/crafting</loc>");
  expect(sitemap).not.toContain("/builds/new</loc>");
  expect(sitemap).not.toContain("/api/");
});
