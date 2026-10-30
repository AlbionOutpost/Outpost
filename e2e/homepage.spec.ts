import { test, expect } from "@playwright/test";

const quote = (city: string, sell: number, buy: number, date: string) => ({
  item_id: "T6_METALBAR",
  city,
  quality: 1,
  sell_price_min: sell,
  sell_price_min_date: date,
  buy_price_max: buy,
  buy_price_max_date: date,
});

test("landing page: independent header, bounded hero, live previews and a structured footer", async ({
  page,
}) => {
  await page.route("**/api/market?*", (route) => {
    return route.fulfill({
      json: {
        region: "europe",
        fetchedAt: new Date().toISOString(),
        source: "Albion Online Data Project",
        prices: [
          quote("Bridgewatch", 3670, 2165, new Date(Date.now() - 9 * 60000).toISOString()),
          quote("Martlock", 4190, 0, new Date(Date.now() - 3 * 3600000).toISOString()),
        ],
      },
    });
  });
  await page.route("**/api/history?*", (route) => {
    const kind = new URL(route.request().url()).searchParams.get("kind");
    return route.fulfill({
      json: {
        region: "europe",
        fetchedAt: new Date().toISOString(),
        source: "Albion Online Data Project",
        data:
          kind === "gold"
            ? [
                { price: 9900, timestamp: "2026-10-30T09:00:00" },
                { price: 9850, timestamp: "2026-10-30T08:00:00" },
              ]
            : [
                {
                  location: "Bridgewatch",
                  item_id: "T6_METALBAR",
                  quality: 1,
                  data: [
                    { item_count: 10, avg_price: 3500, timestamp: "2026-10-01T00:00:00" },
                    { item_count: 12, avg_price: 3900, timestamp: "2026-10-15T00:00:00" },
                    { item_count: 8, avg_price: 3400, timestamp: "2026-10-29T00:00:00" },
                  ],
                },
              ],
      },
    });
  });
  await page.route("**/api/economy/preview?*", (route) =>
    route.fulfill({
      json: {
        region: "europe",
        source: "Albion Online Data Project",
        recipe: {
          id: "battleaxe-t6",
          name: "T6 Battleaxe",
          output: "T6_MAIN_AXE",
          kind: "crafting",
        },
        assumptions: {
          city: "Bridgewatch",
          batches: Number(new URL(route.request().url()).searchParams.get("batches") ?? 1),
          returnRate: 0,
          useFocus: false,
          stationFee: 0,
          tax: 4,
          setupFee: 2.5,
        },
        rows: [
          {
            id: "T6_PLANKS",
            name: "Bloodoak Planks",
            quantity: 8,
            unit: 2894,
            gross: 23152,
            observedAt: new Date().toISOString(),
          },
          {
            id: "T6_METALBAR",
            name: "Runite Steel Bar",
            quantity: 16,
            unit: null,
            gross: null,
            observedAt: null,
          },
        ],
        output: { quantity: 1, unit: 32325, observedAt: new Date().toISOString() },
        complete: false,
        missing: ["T6_METALBAR"],
        stale: false,
        upfront: null,
        revenue: null,
        fees: null,
        profit: null,
        profitPerItem: null,
        margin: null,
      },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?region=europe");
  await expect(page.locator("h1")).toHaveText("Your Albionadvantage.");

  // The header keeps its own surface above the hero instead of floating over it.
  const hero = page.locator(".landing-hero");
  await expect(hero).toBeVisible();
  const layout = await page.evaluate(() => {
    const h = document.querySelector(".site-header")!.getBoundingClientRect();
    const s = document.querySelector(".landing-hero")!.getBoundingClientRect();
    return {
      headerBottom: h.bottom,
      heroTop: s.top,
      position: getComputedStyle(document.querySelector(".site-header")!).position,
    };
  });
  expect(layout.headerBottom).toBeLessThanOrEqual(layout.heroTop + 1);
  expect(layout.position).toBe("relative");

  const actions = hero.locator(".landing-actions a");
  await expect(actions.nth(0)).toHaveText(/Explore Tools/);
  await expect(actions.nth(0)).toHaveAttribute("href", "/tools?region=europe");
  await expect(actions.nth(1)).toHaveAttribute("href", "/builds/library?region=europe");

  await expect(hero.locator(".landing-hero-art img")).toBeVisible();
  const benefits = hero.getByRole("list", { name: "What Outpost does" }).getByRole("listitem");
  await expect(benefits).toHaveCount(4);

  // Three product cards, loaded from the real endpoints once scrolled into view, each with
  // working controls and one action.
  const cards = page.locator(".landing-card");
  await expect(cards).toHaveCount(3);
  await cards.first().scrollIntoViewIfNeeded();
  const market = cards.nth(0);
  await expect(market.locator(".market-preview-item")).toContainText("Tier 6 · Refined material");
  await expect(market.locator("tbody tr")).toHaveCount(5);
  await expect(market.locator("tbody tr").nth(0)).toContainText(/Bridgewatch\s*3,670\s*2,165/);
  await expect(market.locator("tbody tr").nth(0).locator(".city-dot")).toHaveAttribute(
    "data-city",
    "Bridgewatch",
  );
  await expect(market.locator("tbody tr").nth(0).locator("time")).toHaveText("9 min ago");
  await expect(market.locator("tbody tr").nth(1)).toContainText("Unavailable");
  await expect(market.locator("tbody tr").nth(2).locator("time")).toHaveClass(/is-stale/);
  await expect(market.locator(".market-preview-trend svg")).toBeVisible();
  await expect(market.locator(".market-preview-y span")).toHaveCount(3);
  await expect(market.locator(".market-preview-axis span").first()).toHaveText("10/01");
  await expect(market.locator(".market-preview-range")).toHaveText("3,400 – 3,900");
  await market.getByRole("tab", { name: "7d" }).click();
  await expect(market.locator(".market-preview-trend figcaption")).toContainText("7-day average");
  await market.getByLabel("Trend city").selectOption("Caerleon");
  await expect(market.locator(".market-preview-trend figcaption")).toContainText("Caerleon");
  await expect(market.getByRole("link", { name: "Search for an item…" })).toHaveAttribute(
    "href",
    "/tools/market?region=europe",
  );
  await expect(market.getByRole("link", { name: /Open Market Explorer/ })).toHaveAttribute(
    "href",
    "/tools/market?item=T6_METALBAR&quality=1&region=europe",
  );

  // One public build per activity on the game's loadout board, abilities on their keys.
  const build = cards.nth(1);
  const activities = build.getByRole("tablist", { name: "Activity" }).getByRole("tab");
  await expect(activities).toHaveCount(4);
  await expect(activities.nth(0)).toHaveAttribute("aria-selected", "true");
  await expect(build.locator(".build-card-title")).toContainText("Battleaxe Mist Build");
  await expect(build.locator(".build-card-title")).toContainText("▲ 209");
  const board = build.locator(".loadout-board");
  await expect(board.getByRole("listitem")).toHaveCount(10);
  await expect(board.locator('[data-slot="Main hand"] .loadout-board-cell img')).toBeVisible();
  await expect(board.locator('[data-slot="Bag"]')).toHaveClass(/is-empty/);
  await expect(board.locator('[data-slot="Mount"]')).toHaveClass(/is-empty/);
  const keys = build.getByRole("list", { name: "Abilities by key" }).getByRole("listitem");
  await expect(keys).toHaveCount(6);
  await expect(keys.nth(0)).toContainText("Q");
  await expect(keys.nth(0).locator("img")).toBeVisible();
  await activities.nth(2).click();
  await expect(build.locator(".build-card-title")).toContainText("Great Hammer");
  await expect(build.locator(".build-card-title a")).toHaveAttribute(
    "href",
    "/builds/library/great-hammer-zvz-build?region=europe",
  );
  await expect(build.locator(".build-showcase-foot")).toContainText("recorded pieces");
  await expect(build.getByRole("link", { name: /Browse Builds/ })).toHaveAttribute(
    "href",
    "/builds/library?region=europe",
  );

  // Crafting: recipe, city and batch size re-price through the same service as the calculator.
  const crafting = cards.nth(2);
  await expect(crafting.getByRole("tablist", { name: "Scenario" }).getByRole("tab")).toHaveCount(2);
  await expect(crafting.getByRole("list", { name: "Materials" }).getByRole("listitem")).toHaveCount(
    2,
  );
  await expect(crafting.locator(".crafting-preview-materials li").first()).toContainText(
    /Bloodoak Planks\s*× 8\s*2,894\s*23,152/,
  );
  await expect(crafting.locator(".crafting-preview-result-head")).toContainText(
    "Cost & profit (1 item)",
  );
  await expect(crafting.locator(".crafting-preview-result .is-total")).toContainText(
    /Total cost\s*—/,
  );
  await expect(crafting.locator(".landing-preview-status")).toContainText(
    "No Bridgewatch price for Runite Steel Bar",
  );
  const batches = crafting.getByRole("group", { name: "Batch size" });
  await expect(batches.getByRole("button", { name: "Fewer batches" })).toBeDisabled();
  await batches.getByRole("button", { name: "More batches" }).click();
  await expect(batches.locator("output")).toHaveText("2");
  await expect(crafting.locator(".crafting-preview-assumptions")).toBeVisible();
  await crafting.getByLabel("City").selectOption("Martlock");
  await expect(crafting.locator(".crafting-preview-result")).toContainText(
    "Market price (Martlock)",
  );
  await crafting.getByLabel("Recipe").selectOption("broadsword-t6");
  await crafting.getByRole("tab", { name: "Refine material" }).click();
  await expect(crafting.getByLabel("Recipe")).toHaveValue("metalbar-t6");
  await expect(crafting.getByRole("link", { name: /Open Crafting Calculator/ })).toHaveAttribute(
    "href",
    "/tools/crafting?recipe=battleaxe-t6&region=europe",
  );

  // Group Compositions: a real library comp read by weapon type, members as real renders.
  const roles = page.locator(".group-role");
  await expect(roles).toHaveCount(4);
  await expect(roles.nth(0)).toContainText("Tank");
  await expect(
    roles.nth(0).getByRole("list", { name: "Tank members" }).getByRole("link").first(),
  ).toHaveAttribute("href", /\/builds\/library\/[a-z0-9-]+\?region=europe/);
  await expect(page.getByRole("link", { name: /Explore Compositions/ })).toHaveAttribute(
    "href",
    /\/compositions\/library\/[a-z0-9-]+\?region=europe/,
  );

  // Advertising stays off until configured; the ad-free offer is always there.
  await expect(page.locator(".adsbygoogle")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Go ad-free with Premium" })).toHaveAttribute(
    "href",
    "/premium?region=europe",
  );
  await expect(page.locator(".landing-why-grid li")).toHaveCount(4);
  await expect(page.locator(".landing-cta h2")).toHaveText(
    "Make better decisionsin Albion Online.",
  );
  await expect(page.getByRole("link", { name: "Create account" })).toHaveAttribute(
    "href",
    "/signin?region=europe",
  );
  const footer = page.locator("footer.site-footer");
  await expect(footer.getByRole("navigation", { name: "Explore" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Crafting calculator" })).toHaveAttribute(
    "href",
    "/tools/crafting?region=europe",
  );
  await expect(footer).toContainText("Albion Online Data Project");

  // Region picker: every server named, the current one marked.
  await page.getByRole("combobox", { name: "Albion region" }).click();
  const options = page.getByRole("listbox", { name: "Game servers" }).getByRole("option");
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toContainText("Albion Europe");
  await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
  await expect(options.nth(1)).toContainText("Albion West");
  await page.keyboard.press("Escape");

  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  // Phones keep the sell column and hide the buy column rather than scrolling sideways.
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(market.locator("thead th").nth(2)).toBeHidden();
  await expect(market.locator("thead th").nth(1)).toBeVisible();
});

test("premium page explains the ad-free tier without selling anything yet", async ({ page }) => {
  await page.goto("/premium?region=europe");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Outpost without ads");
  await expect(page.getByRole("heading", { name: "Not for sale yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Sign in with Discord/ })).toHaveAttribute(
    "href",
    "/signin?region=europe",
  );
  await expect(page.locator("body")).not.toContainText(/\$|€|per month/);
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
