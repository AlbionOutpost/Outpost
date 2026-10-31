import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { normalizeTopKills } from "../src/lib/albion/combat-events";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const quote = (item: string, city: string, sell: number, buy: number, date: string) => ({
  item_id: item,
  city,
  quality: 1,
  sell_price_min: sell,
  sell_price_min_date: date,
  buy_price_max: buy,
  buy_price_max_date: date,
});
// The source's kill-fame page captured on 30 Oct 2026; ages are relative to its fetch time.
const topKills = normalizeTopKills(
  JSON.parse(readFileSync("tests/fixtures/combat-top-kills.json", "utf8")),
);

test("landing page: hero numbers, teaser windows, live tool cards, guides, top kills and the footer", async ({
  page,
}) => {
  await page.route("**/api/market?*", (route) =>
    route.fulfill({
      json: {
        region: "europe",
        fetchedAt: new Date().toISOString(),
        source: "Albion Online Data Project",
        prices: [
          quote("T6_METALBAR", "Martlock", 4190, 3900, minutesAgo(180)),
          quote("T6_METALBAR", "Bridgewatch", 3670, 2165, minutesAgo(9)),
          quote("T6_METALBAR", "Caerleon", 3900, 0, minutesAgo(30)),
        ],
      },
    }),
  );
  await page.route("**/api/history?*", (route) =>
    route.fulfill({
      json: {
        region: "europe",
        fetchedAt: new Date().toISOString(),
        source: "Albion Online Data Project",
        data: [
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
    }),
  );
  await page.route("**/api/landing/craft?*", (route) => {
    const batches = Number(new URL(route.request().url()).searchParams.get("batches") ?? 1);
    return route.fulfill({
      json: {
        region: "europe",
        source: "Albion Online Data Project",
        batches,
        candidates: 5,
        assumptions: { tax: 4, setupFee: 2.5, returnRate: 0, useFocus: false },
        best: {
          recipe: { id: "cape-t6", name: "T6 Cape", output: "T6_CAPE", kind: "crafting" },
          city: "Thetford",
          rows: [
            {
              id: "T6_CLOTH",
              name: "Lavish Cloth",
              quantity: 4 * batches,
              unit: 3594,
              gross: 14376 * batches,
            },
            {
              id: "T6_LEATHER",
              name: "Hardened Leather",
              quantity: 4 * batches,
              unit: 5499,
              gross: 21996 * batches,
            },
          ],
          outputQuantity: batches,
          complete: true,
          missing: [],
          stale: false,
          upfront: 36372 * batches,
          fees: 1754 * batches,
          revenue: 26984 * batches,
          profit: -11142 * batches,
          margin: -41.3,
        },
        byCity: [
          { city: "Thetford", profit: -11142 * batches, margin: -41.3 },
          { city: "Lymhurst", profit: -13826 * batches, margin: -50.1 },
        ],
      },
    });
  });
  await page.route("**/api/market/batch?*", (route) => {
    const u = new URL(route.request().url());
    const items = (u.searchParams.get("items") ?? "").split(",");
    return route.fulfill({
      json: {
        region: "europe",
        fetchedAt: new Date().toISOString(),
        source: "Albion Online Data Project",
        prices: items.flatMap((id) =>
          id === "T6_POTION_HEAL"
            ? []
            : [
                quote(id, "Martlock", 1000, 900, minutesAgo(5)),
                quote(id, "Thetford", 1200, 900, minutesAgo(5)),
              ],
        ),
      },
    });
  });
  await page.route("**/api/combat-events/top?*", (route) =>
    route.fulfill({
      json: {
        region: "europe",
        source: "Albion Online Game Info",
        fetchedAt: "2026-10-30T21:45:00Z",
        events: topKills.map((e, i) => ({
          ...e,
          inventory: i === 2 ? [] : e.inventory,
          crew: i === 1 ? e.crew.slice(0, 4) : e.crew,
          gearValue: i === 2 ? null : { total: 232_520_000, priced: 7, missing: 1 },
        })),
      },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?region=europe");
  await expect(page.locator("h1")).toHaveText("Your Albionadvantage.");

  // The hero keeps the header on its own bar and shows only measured numbers.
  const layout = await page.evaluate(() => {
    const h = document.querySelector(".site-header")!.getBoundingClientRect();
    const s = document.querySelector(".landing-hero")!.getBoundingClientRect();
    return { headerBottom: h.bottom, heroTop: s.top };
  });
  expect(layout.headerBottom).toBeLessThanOrEqual(layout.heroTop + 1);
  const actions = page.locator(".landing-hero .landing-actions a");
  await expect(actions.nth(0)).toHaveAttribute("href", "/tools?region=europe");
  await expect(actions.nth(1)).toHaveAttribute("href", "/builds/library?region=europe");
  const stats = page.getByRole("term");
  await expect(stats).toContainText([
    "Players signed up",
    "Public builds",
    "Group comps",
    "Calculators",
  ]);
  await expect(page.locator(".landing-stats dd").nth(1)).toHaveText(/^[\d,]+$/);

  // Windows: a public build on the board with its chosen abilities on the pieces, what a Team
  // does, and a comp read as a roster by weapon type.
  const windows = page.locator(".landing-window");
  await expect(windows).toHaveCount(3);
  const board = windows.nth(0).locator(".loadout-board");
  await expect(board.getByRole("listitem")).toHaveCount(10);
  await expect(board.locator('[data-slot="Main hand"] .loadout-board-abilities img')).toHaveCount(
    3,
  );
  await expect(board.locator('[data-slot="Helmet"] .loadout-board-abilities img')).toHaveCount(2);
  await expect(board.locator('[data-slot="Bag"]')).toHaveClass(/is-empty/);
  const heart = windows.nth(0).locator(".heart-chip");
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(heart).toHaveAccessibleName(/Remove .* from this device/);
  await expect(heart).toContainText(/\d/);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("outpost:build-bookmarks:v1:europe") ?? "{}"),
    ),
  ).toMatchObject({ builds: [{ slug: "hallowfall-healer-zvz-build" }] });
  await expect(
    windows.nth(1).getByRole("list", { name: "What a Team workspace does" }).getByRole("listitem"),
  ).toHaveCount(5);
  const roster = windows
    .nth(2)
    .getByRole("list", { name: "Members by weapon type" })
    .getByRole("listitem");
  await expect(roster).toHaveCount(5);
  await expect(roster.nth(0)).toHaveAttribute("data-role", /Tank|Healer|DPS|Support/);
  await expect(roster.nth(0).getByRole("link")).toHaveAttribute(
    "href",
    /\/builds\/library\/[a-z0-9-]+\?region=europe/,
  );
  await expect(windows.nth(2).locator(".landing-window-foot")).toHaveAttribute(
    "href",
    /\/compositions\/library\/hellgate-5v5-front-to-back/,
  );

  // Tool cards, loaded from the mocked endpoints once in view.
  const cards = page.locator(".landing-card");
  await expect(cards).toHaveCount(3);
  await cards.first().scrollIntoViewIfNeeded();
  const market = cards.nth(0);
  await expect(market.locator(".tool-item")).toContainText("Refined material · Tier 6");
  await expect(market.locator("tbody tr")).toHaveCount(3);
  await expect(market.locator("tbody tr").nth(0)).toContainText(
    /Bridgewatch\s*2,165\s*3,670\s*\+69\.5%/,
  );
  await expect(market.locator("tbody tr").nth(0).locator(".city-dot")).toHaveAttribute(
    "data-city",
    "Bridgewatch",
  );
  await expect(market.locator("tbody tr").nth(1)).toContainText(/Caerleon\s*—\s*3,900\s*—/);
  await expect(market.locator("tbody tr").nth(2).locator("td").nth(1)).toHaveClass(/is-stale/);
  await expect(market.locator(".tool-plot svg")).toBeVisible();
  await expect(market.locator(".tool-plot-y i")).toHaveCount(3);
  await expect(market.locator(".tool-plot-x i").first()).toHaveText("1 Oct");
  await expect(market.locator(".tool-plot-tip")).toContainText("3,400");
  await market.getByRole("tab", { name: "7D" }).click();
  await expect(market.getByRole("tab", { name: "7D" })).toHaveAttribute("aria-selected", "true");
  await expect(market.getByRole("link", { name: /Open Market Explorer/ })).toHaveAttribute(
    "href",
    "/tools/market?item=T6_METALBAR&quality=1&region=europe",
  );

  const crafting = cards.nth(1);
  await expect(crafting.locator(".tool-item")).toContainText("Cape");
  await expect(crafting.locator(".tool-item")).toContainText("Thetford · best of 5 recipes");
  await expect(crafting.locator(".tool-table tbody tr")).toHaveCount(2);
  await expect(crafting.locator(".tool-table tbody tr").first()).toContainText(
    /Lavish Cloth\s*4\s*3,594\s*14,376/,
  );
  await expect(crafting.locator(".tool-pair")).toContainText(/38,126[\s\S]*26,984/);
  await expect(crafting.locator(".tool-profit")).toHaveClass(/is-loss/);
  await expect(crafting.locator(".tool-profit")).toContainText(/−\s*11,142[\s\S]*-41\.3%/);
  await expect(crafting.locator(".tool-cities li em")).toHaveCount(0);
  await crafting.getByRole("button", { name: "More batches" }).click();
  await expect(crafting.locator(".tool-stepper output")).toHaveText("2");
  await expect(crafting.locator(".tool-table tbody tr").first()).toContainText(/28,752/);
  await expect(crafting.getByRole("link", { name: /Open Crafting Calculator/ })).toHaveAttribute(
    "href",
    "/tools/crafting?region=europe",
  );

  const planner = cards.nth(2);
  await expect(
    planner.getByRole("list", { name: "Planned items" }).getByRole("listitem"),
  ).toHaveCount(3);
  await expect(planner.locator(".tool-summary")).toContainText(/Owned\s*0 \/ 33/);
  await expect(planner.locator(".tool-summary")).toContainText(/Still to buy\s*13,000\+/);
  await expect(planner.locator(".tool-queue li").nth(2)).toContainText("no listing");
  await planner
    .getByRole("group", { name: /Owned T4 Cape|Owned .*Cape/ })
    .getByRole("button", { name: "Own one more" })
    .click();
  await expect(planner.locator(".tool-summary")).toContainText(/Owned\s*1 \/ 33/);
  await expect(planner.locator(".tool-summary")).toContainText(/12,000\+/);
  await planner.getByRole("tab", { name: "Shopping list" }).click();
  await expect(planner.locator(".tool-queue li").first()).toContainText(/Buy 9/);
  await expect(planner.locator(".tool-cities li").first()).toContainText(/Martlock[\s\S]*12,000\+/);
  await expect(planner.locator(".tool-cities li em")).toHaveCount(0);
  await expect(planner.getByRole("link", { name: /Open Crafting Planner/ })).toHaveAttribute(
    "href",
    "/shopping-list?region=europe",
  );

  // Guides slide three at a time with their reading time.
  const guides = page.locator(".guide-card");
  await expect(guides).toHaveCount(8);
  await expect(guides.first().locator(".guide-card-time")).toHaveText(/\d+ min read/);
  await expect(guides.first().getByRole("link")).toHaveAttribute(
    "href",
    /\/guides\/[a-z0-9-]+\?region=europe/,
  );
  await expect(page.getByRole("button", { name: "Previous guides" })).toBeHidden();
  await page.getByRole("button", { name: "Next guides" }).click();
  await expect(page.getByRole("button", { name: "Previous guides" })).toBeVisible();

  // Top kills: the heading says how old the ranking is, each card a killboard.
  await expect(page.locator("#home-kills-title")).toHaveText("Top kills this week");
  const kills = page.locator(".kill-card");
  await expect(kills).toHaveCount(3);
  await expect(kills.nth(0).locator(".kill-trophy")).toHaveAttribute("alt", "#1");
  await expect(kills.nth(0).locator(".kill-side").nth(0)).toContainText("Hatazan1");
  await expect(kills.nth(0).locator(".kill-side.is-victim")).toContainText("KilluaXcore");
  await expect(kills.nth(0).locator(".kill-mid strong").nth(0)).toHaveText("21.9m");
  await expect(kills.nth(0).locator(".kill-mid strong.is-silver")).toHaveText("232.52m+");
  await expect(kills.nth(0).locator(".kill-mid strong.is-silver")).toHaveAttribute(
    "title",
    /Estimated/,
  );
  await expect(kills.nth(0).locator(".kill-killed")).toHaveAttribute("title", /Killed .* UTC/);
  await expect(kills.nth(0).locator(".loadout-board")).toHaveCount(2);
  await expect(kills.nth(0).locator(".kill-loot li")).toHaveCount(18);
  await expect(kills.nth(2).locator(".kill-loot-empty")).toHaveText("Nothing carried");
  await expect(kills.nth(2).locator(".kill-mid strong.is-silver")).toHaveText("—");
  const toggle = kills.nth(1).getByRole("button", { name: "Show 4 participants" });
  await toggle.click();
  await expect(
    kills.nth(1).getByRole("list", { name: "Participants" }).getByRole("listitem"),
  ).toHaveCount(4);
  await expect(kills.nth(1).locator(".kill-people li").first()).toContainText(/healing/);
  await expect(page.getByRole("link", { name: /Open the kill feed/ })).toHaveAttribute(
    "href",
    "/tools/kill-feed?region=europe",
  );

  // Activities: real counts from the library, each linking to its filtered list.
  const activities = page.locator(".activity-card");
  await expect(activities).toHaveCount(8);
  await expect(activities.first()).toHaveAttribute(
    "href",
    "/builds/library?category=ZVZ&region=europe",
  );
  await expect(activities.first().locator(".activity-copy")).toContainText(/ZvZ\s*[\d,]+ builds/);
  await expect(activities.first().locator(".activity-weapons img")).toHaveCount(3);

  // Advertising stays off until configured; the plans say what is free and what supports.
  await expect(page.locator(".adsbygoogle")).toHaveCount(0);
  const plans = page.locator(".plan-card");
  await expect(plans).toHaveCount(2);
  await expect(plans.nth(0)).toContainText("No account needed");
  await expect(plans.nth(1)).toContainText("No ads anywhere on Outpost");
  // Billing is off in this environment: nothing is priced or sold.
  await expect(plans.nth(1)).toContainText("Opening soon");
  await expect(plans.nth(1)).not.toContainText(/\$|€|per month/);
  await expect(
    plans.nth(1).getByRole("link", { name: /About the Supporter plan/ }),
  ).toHaveAttribute("href", "/supporter?region=europe");
  const footer = page.locator("footer.site-footer");
  await expect(footer.getByRole("navigation", { name: "Explore" })).toBeVisible();
  await expect(footer).toContainText("Albion Online Data Project");

  // Region picker: every server named, the current one marked.
  await page.getByRole("combobox", { name: "Albion region" }).click();
  const options = page.getByRole("listbox", { name: "Game servers" }).getByRole("option");
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");

  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test("landing page keeps every state honest when the sources are down", async ({ page }) => {
  for (const path of [
    "**/api/market?*",
    "**/api/history?*",
    "**/api/landing/craft?*",
    "**/api/market/batch?*",
  ])
    await page.route(path, (route) =>
      route.fulfill({ status: 503, json: { error: "Source unavailable" } }),
    );
  await page.route("**/api/combat-events/top?*", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Albion’s kill ranking is unavailable right now." },
    }),
  );
  await page.goto("/?region=europe");
  const cards = page.locator(".landing-card");
  await cards.first().scrollIntoViewIfNeeded();
  await expect(cards.nth(0).locator("tbody")).toContainText("Source unavailable");
  await expect(cards.nth(1).locator(".tool-item")).toContainText("Unavailable");
  await expect(cards.nth(1).locator(".tool-profit")).toContainText("—");
  await expect(cards.nth(2).locator(".tool-summary")).toContainText(/Still to buy\s*—/);
  await expect(page.locator(".landing-kills")).toContainText("kill ranking is unavailable");
  await expect(page.locator(".kill-card")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/NaN|undefined/);
});

test("supporter page explains the plan without selling anything while billing is off", async ({
  page,
}) => {
  await page.goto("/premium?region=europe");
  await expect(page).toHaveURL(/\/supporter\?region=europe/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Support Outpost");
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
